const API = 'https://api.cloudflare.com/client/v4';

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

function unauthorized() {
  return json({ ok: false, code: 'OCX_UNAUTHORIZED' }, 401);
}

function requireAuth(request, env) {
  const supplied = request.headers.get('x-ocx-key') || '';
  return Boolean(env.OCX_SHARED_SECRET && supplied && supplied === env.OCX_SHARED_SECRET);
}

async function cf(env, path, init = {}) {
  if (!env.CLOUDFLARE_API_TOKEN) {
    return { ok: false, status: 503, body: { success: false, errors: [{ message: 'CLOUDFLARE_API_TOKEN binding missing' }] } };
  }
  const headers = new Headers(init.headers || {});
  headers.set('authorization', `Bearer ${env.CLOUDFLARE_API_TOKEN}`);
  headers.set('content-type', 'application/json');
  const res = await fetch(`${API}${path}`, { ...init, headers });
  let body;
  try { body = await res.json(); } catch { body = { success: false, errors: [{ message: 'Non-JSON Cloudflare response' }] }; }
  return { ok: res.ok && body?.success !== false, status: res.status, body };
}

function controlled(request) {
  return request.headers.get('x-ocx-mode') === 'controlled';
}

function safeRecord(input = {}) {
  const allowed = ['A','AAAA','CNAME','TXT','MX','CAA','SRV'];
  if (!allowed.includes(input.type)) throw new Error('Unsupported DNS record type');
  if (!input.name || !input.content) throw new Error('name and content are required');
  return {
    type: input.type,
    name: String(input.name),
    content: String(input.content),
    ttl: Number.isFinite(Number(input.ttl)) ? Number(input.ttl) : 1,
    proxied: ['A','AAAA','CNAME'].includes(input.type) ? Boolean(input.proxied) : undefined,
    priority: input.priority == null ? undefined : Number(input.priority),
    comment: input.comment ? String(input.comment).slice(0, 100) : 'OCX managed'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({
        ok: true,
        service: 'OCX CLO CONNECTOR',
        version: '0.1.0',
        environment: env.OCX_ENV || 'unknown',
        bindings: {
          cloudflare_api_token: Boolean(env.CLOUDFLARE_API_TOKEN),
          ocx_shared_secret: Boolean(env.OCX_SHARED_SECRET),
          account_id: Boolean(env.CLOUDFLARE_ACCOUNT_ID)
        }
      });
    }

    if (!requireAuth(request, env)) return unauthorized();

    if (url.pathname === '/capabilities' && request.method === 'GET') {
      return json({
        ok: true,
        connector: 'CLO',
        policy: {
          read: 'R0/R1',
          dns_create_update: 'R2 CONTROLLED + VERIFY',
          worker_route_create: 'R2 CONTROLLED + VERIFY',
          destructive_actions: 'NOT EXPOSED IN v0.1'
        },
        commands: [
          'CLO.TOKEN.VERIFY',
          'CLO.ZONE.LIST',
          'CLO.DNS.LIST',
          'CLO.DNS.CREATE',
          'CLO.DNS.UPDATE',
          'CLO.WORKER.ROUTE.LIST',
          'CLO.WORKER.ROUTE.CREATE'
        ]
      });
    }

    if (url.pathname === '/token/verify' && request.method === 'GET') {
      const r = await cf(env, '/user/tokens/verify');
      return json({ ok: r.ok, cloudflare: r.body }, r.ok ? 200 : r.status);
    }

    if (url.pathname === '/zones' && request.method === 'GET') {
      const name = url.searchParams.get('name');
      const qs = name ? `?name=${encodeURIComponent(name)}` : '';
      const r = await cf(env, `/zones${qs}`);
      return json({ ok: r.ok, cloudflare: r.body }, r.ok ? 200 : r.status);
    }

    let m = url.pathname.match(/^\/zones\/([a-f0-9]{32})\/dns$/i);
    if (m && request.method === 'GET') {
      const r = await cf(env, `/zones/${m[1]}/dns_records`);
      return json({ ok: r.ok, cloudflare: r.body }, r.ok ? 200 : r.status);
    }

    if (m && request.method === 'POST') {
      if (!controlled(request)) return json({ ok: false, code: 'OCX_CONTROLLED_MODE_REQUIRED' }, 409);
      try {
        const record = safeRecord(await request.json());
        const r = await cf(env, `/zones/${m[1]}/dns_records`, { method: 'POST', body: JSON.stringify(record) });
        return json({ ok: r.ok, command: 'CLO.DNS.CREATE', verify_required: true, cloudflare: r.body }, r.ok ? 200 : r.status);
      } catch (e) {
        return json({ ok: false, error: e.message }, 400);
      }
    }

    m = url.pathname.match(/^\/zones\/([a-f0-9]{32})\/dns\/([a-f0-9]{32})$/i);
    if (m && request.method === 'PATCH') {
      if (!controlled(request)) return json({ ok: false, code: 'OCX_CONTROLLED_MODE_REQUIRED' }, 409);
      try {
        const record = safeRecord(await request.json());
        const r = await cf(env, `/zones/${m[1]}/dns_records/${m[2]}`, { method: 'PATCH', body: JSON.stringify(record) });
        return json({ ok: r.ok, command: 'CLO.DNS.UPDATE', verify_required: true, cloudflare: r.body }, r.ok ? 200 : r.status);
      } catch (e) {
        return json({ ok: false, error: e.message }, 400);
      }
    }

    m = url.pathname.match(/^\/zones\/([a-f0-9]{32})\/routes$/i);
    if (m && request.method === 'GET') {
      const r = await cf(env, `/zones/${m[1]}/workers/routes`);
      return json({ ok: r.ok, cloudflare: r.body }, r.ok ? 200 : r.status);
    }

    if (m && request.method === 'POST') {
      if (!controlled(request)) return json({ ok: false, code: 'OCX_CONTROLLED_MODE_REQUIRED' }, 409);
      const body = await request.json().catch(() => ({}));
      if (!body.pattern || !body.script) return json({ ok: false, error: 'pattern and script are required' }, 400);
      const payload = { pattern: String(body.pattern), script: String(body.script) };
      const r = await cf(env, `/zones/${m[1]}/workers/routes`, { method: 'POST', body: JSON.stringify(payload) });
      return json({ ok: r.ok, command: 'CLO.WORKER.ROUTE.CREATE', verify_required: true, cloudflare: r.body }, r.ok ? 200 : r.status);
    }

    return json({ ok: false, code: 'NOT_FOUND' }, 404);
  }
};
