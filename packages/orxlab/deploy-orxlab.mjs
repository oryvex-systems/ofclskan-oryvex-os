import fs from 'node:fs/promises';

const API = 'https://api.cloudflare.com/client/v4';
const DOMAIN = 'oryvx.com.tr';
const HOST = 'lab.oryvx.com.tr';
const SERVICE = 'orxlab';
const ROUTE = `${HOST}/*`;

const token = process.env.CLO_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLO_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token) throw new Error('Missing CLO_API_TOKEN/CLOUDFLARE_API_TOKEN');
if (!accountId) throw new Error('Missing CLO_ACCOUNT_ID/CLOUDFLARE_ACCOUNT_ID');

async function cf(path, init = {}) {
  const response = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok || body.success === false) {
    const msg = body?.errors?.map(e => e.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(`${path}: ${msg}`);
  }
  return body;
}

async function deployWorker() {
  const source = await fs.readFile(new URL('./worker/orxlab-worker.js', import.meta.url), 'utf8');
  const boundary = `----orxlab-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ main_module: 'worker.js', compatibility_date: '2026-08-19' });
  const multipart = [
    `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n${source}\r\n`,
    `--${boundary}--\r\n`
  ].join('');

  const response = await fetch(`${API}/accounts/${accountId}/workers/scripts/${SERVICE}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: multipart
  });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok || data.success === false) {
    const msg = data?.errors?.map(e => e.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(`Worker deploy failed: ${msg}`);
  }
}

async function main() {
  const verify = await cf('/user/tokens/verify');
  console.log('TOKEN', verify.result?.status || 'unknown');

  const zones = await cf(`/zones?name=${encodeURIComponent(DOMAIN)}`);
  const zone = zones.result?.[0];
  if (!zone) throw new Error(`Zone not found: ${DOMAIN}`);
  if (zone.status !== 'active') throw new Error(`Zone not active: ${zone.status}`);

  const dns = await cf(`/zones/${zone.id}/dns_records?name=${encodeURIComponent(HOST)}&per_page=100`);
  const records = dns.result || [];
  if (records.length === 0) {
    await cf(`/zones/${zone.id}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: HOST, content: DOMAIN, proxied: true, ttl: 1, comment: 'ORXLAB service' })
    });
  } else {
    const ok = records.some(r => r.type === 'CNAME' && String(r.content).toLowerCase() === DOMAIN && r.proxied === true);
    if (!ok) throw new Error(`Safety block: ${HOST} has conflicting DNS`);
  }

  await deployWorker();

  const routes = await cf(`/zones/${zone.id}/workers/routes`);
  const existing = (routes.result || []).find(r => r.pattern === ROUTE);
  if (existing && existing.script !== SERVICE) throw new Error(`Route conflict: ${ROUTE}`);
  if (!existing) {
    await cf(`/zones/${zone.id}/workers/routes`, { method: 'POST', body: JSON.stringify({ pattern: ROUTE, script: SERVICE }) });
  }

  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const response = await fetch(`https://${HOST}/health`, { headers: { accept: 'application/json' } });
      const body = await response.json();
      if (response.ok && body?.status === 'READY' && body?.service === 'ORXLAB') {
        console.log(JSON.stringify({ status: 'ORXLAB_READY', domain: HOST, attempt, body }, null, 2));
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error('ORXLAB verification failed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
