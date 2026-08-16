export default {
  async fetch(request, env) {
    const API = 'https://api.cloudflare.com/client/v4';
    const url = new URL(request.url);

    const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });

    const redact = value => JSON.parse(JSON.stringify(value, (key, v) =>
      /token|secret|password|auth.?code|epp|key/i.test(key) ? '[REDACTED]' : v
    ));

    const audit = (event, data = {}) => {
      console.log(JSON.stringify({ ts: new Date().toISOString(), system: 'OCX-DOPLT', event, ...redact(data) }));
    };

    const requireConfig = () => {
      const missing = [];
      if (!env.CLO_ACCOUNT_ID) missing.push('CLO_ACCOUNT_ID');
      if (!env.CLO_API_TOKEN) missing.push('CLO_API_TOKEN');
      return missing;
    };

    const requireControl = () => {
      if (!env.OCX_CONTROL_TOKEN) return { ok: false, status: 503, reason: 'CONTROL_TOKEN_NOT_CONFIGURED' };
      const supplied = request.headers.get('x-ocx-control-token');
      if (!supplied || supplied !== env.OCX_CONTROL_TOKEN) return { ok: false, status: 401, reason: 'UNAUTHORIZED' };
      return { ok: true };
    };

    async function cf(path, options = {}) {
      const res = await fetch(API + path, {
        ...options,
        headers: {
          Authorization: 'Bearer ' + env.CLO_API_TOKEN,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(JSON.stringify({ status: res.status, errors: data.errors || [], messages: data.messages || [] }));
      }
      return data;
    }

    async function listZones() {
      const all = [];
      let page = 1;
      while (true) {
        const data = await cf('/zones?per_page=50&page=' + page);
        all.push(...(data.result || []));
        const pages = data.result_info?.total_pages || 1;
        if (page >= pages) break;
        page += 1;
      }
      return all;
    }

    async function zoneByName(domain) {
      const data = await cf('/zones?name=' + encodeURIComponent(domain));
      return data.result?.[0] || null;
    }

    async function workerDomains() {
      return cf('/accounts/' + env.CLO_ACCOUNT_ID + '/workers/domains');
    }

    const missing = requireConfig();
    if (missing.length) {
      return json({ system: 'OCX-DOPLT', status: 'CONFIG_REQUIRED', missing }, 500);
    }

    try {
      if (url.pathname === '/health') {
        return json({ system: 'OCX-DOPLT', status: 'READY', bindings: { CLO_ACCOUNT_ID: true, CLO_API_TOKEN: true, OCX_CONTROL_TOKEN: !!env.OCX_CONTROL_TOKEN } });
      }

      if (url.pathname === '/inventory' && request.method === 'GET') {
        const zones = await listZones();
        return json({
          system: 'OCX-DOPLT',
          mode: 'INVENTORY',
          total: zones.length,
          zones: zones.map(z => ({
            domain: z.name,
            zoneId: z.id,
            status: z.status,
            assignedNameServers: z.name_servers || [],
            originalNameServers: z.original_name_servers || []
          }))
        });
      }

      if (url.pathname === '/plan' && request.method === 'GET') {
        const domain = (url.searchParams.get('domain') || 'sozundeusta.com.tr').toLowerCase();
        const targetWorker = url.searchParams.get('worker') || 'sozunde-usta';
        const zone = await zoneByName(domain);
        if (!zone) return json({ system: 'OCX-DOPLT', status: 'ZONE_NOT_FOUND', domain }, 404);
        const domains = await workerDomains();
        const existing = (domains.result || []).find(d => d.hostname === domain);
        return json({
          system: 'OCX-DOPLT',
          mode: 'PLAN',
          domain,
          targetWorker,
          zone: { id: zone.id, name: zone.name, status: zone.status, nameServers: zone.name_servers || [] },
          currentBinding: existing || null,
          workerDomainAttached: existing?.service === targetWorker,
          nextAction: existing?.service === targetWorker ? 'NONE' : 'CLO.WORKER.DOMAIN.CONNECT'
        });
      }

      if (url.pathname === '/apply' && request.method === 'POST') {
        const auth = requireControl();
        if (!auth.ok) return json({ system: 'OCX-DOPLT', status: auth.reason }, auth.status);

        const body = await request.json().catch(() => ({}));
        const domain = String(body.domain || '').toLowerCase();
        const targetWorker = String(body.worker || '');
        if (!domain || !targetWorker) return json({ system: 'OCX-DOPLT', status: 'BAD_REQUEST', required: ['domain', 'worker'] }, 400);

        const zone = await zoneByName(domain);
        if (!zone) return json({ system: 'OCX-DOPLT', status: 'ZONE_NOT_FOUND', domain }, 404);
        if (zone.status !== 'active') return json({ system: 'OCX-DOPLT', status: 'BLOCKED', reason: 'ZONE_NOT_ACTIVE', zoneStatus: zone.status }, 409);

        const domains = await workerDomains();
        const existing = (domains.result || []).find(d => d.hostname === domain);
        if (existing?.service === targetWorker) return json({ system: 'OCX-DOPLT', status: 'ALREADY_CONNECTED', domain, worker: targetWorker });
        if (existing && existing.service !== targetWorker) return json({ system: 'OCX-DOPLT', status: 'BLOCKED', reason: 'DOMAIN_ALREADY_BOUND', currentWorker: existing.service }, 409);

        audit('POLICY_L2_EXECUTE', { action: 'CLO.WORKER.DOMAIN.CONNECT', domain, worker: targetWorker });
        const result = await cf('/accounts/' + env.CLO_ACCOUNT_ID + '/workers/domains', {
          method: 'PUT',
          body: JSON.stringify({ hostname: domain, service: targetWorker, zone_id: zone.id, zone_name: zone.name })
        });

        const verify = await workerDomains();
        const attached = (verify.result || []).find(d => d.hostname === domain && d.service === targetWorker);
        if (!attached) return json({ system: 'OCX-DOPLT', status: 'VERIFY_FAILED', domain, worker: targetWorker }, 500);

        audit('POLICY_L2_PASS', { action: 'CLO.WORKER.DOMAIN.CONNECT', domain, worker: targetWorker });
        return json({ system: 'OCX-DOPLT', status: 'CONNECTED', domain, worker: targetWorker, result: result.result });
      }

      return json({
        system: 'OCX-DOPLT',
        status: 'READY',
        endpoints: {
          health: 'GET /health',
          inventory: 'GET /inventory',
          plan: 'GET /plan?domain=<domain>&worker=<worker>',
          apply: 'POST /apply (requires x-ocx-control-token)'
        }
      });
    } catch (error) {
      audit('ERROR', { error: error?.message || String(error) });
      return json({ system: 'OCX-DOPLT', status: 'ERROR', error: String(error?.message || error) }, 500);
    }
  }
};
