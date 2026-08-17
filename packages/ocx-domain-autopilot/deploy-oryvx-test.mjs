import fs from 'node:fs/promises';

const API = 'https://api.cloudflare.com/client/v4';
const DOMAIN = 'oryvx.info';
const HOST = 'ocx-test.oryvx.info';
const SERVICE = 'ocx-test';
const ROUTE = `${HOST}/*`;

const token = process.env.CLO_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLO_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token) throw new Error('Missing CLO_API_TOKEN/CLOUDFLARE_API_TOKEN');
if (!accountId) throw new Error('Missing CLO_ACCOUNT_ID/CLOUDFLARE_ACCOUNT_ID');

function log(event, data = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), system: 'OCX', pilot: HOST, event, ...data }));
}

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
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok || body.success === false) {
    const msg = body?.errors?.map(e => e.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(`${path}: ${msg}`);
  }
  return body;
}

async function deployWorker(zoneId) {
  const source = await fs.readFile(new URL('./worker/ocx-test-worker.js', import.meta.url), 'utf8');
  const boundary = `----ocx-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ main_module: 'worker.js', compatibility_date: '2026-08-17' });
  const body = [
    `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n${source}\r\n`,
    `--${boundary}--\r\n`
  ].join('');
  const response = await fetch(`${API}/accounts/${accountId}/workers/scripts/${SERVICE}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok || data.success === false) {
    const msg = data?.errors?.map(e => e.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(`Worker deploy failed: ${msg}`);
  }
  log('WORKER_DEPLOYED', { service: SERVICE, zoneId });
}

async function main() {
  const verify = await cf('/user/tokens/verify');
  log('TOKEN_VERIFIED', { status: verify.result?.status || 'unknown' });

  const zones = await cf(`/zones?name=${encodeURIComponent(DOMAIN)}`);
  const zone = zones.result?.[0];
  if (!zone) throw new Error(`Zone not found: ${DOMAIN}`);
  if (zone.status !== 'active') throw new Error(`Zone not active: ${zone.status}`);
  log('ZONE_VERIFIED', { zoneId: zone.id, status: zone.status });

  const dns = await cf(`/zones/${zone.id}/dns_records?name=${encodeURIComponent(HOST)}&per_page=100`);
  const records = dns.result || [];
  if (records.length === 0) {
    await cf(`/zones/${zone.id}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: HOST, content: DOMAIN, proxied: true, ttl: 1, comment: 'OCX isolated test pilot' })
    });
    log('DNS_CREATED', { type: 'CNAME', name: HOST, content: DOMAIN, proxied: true });
  } else {
    const ok = records.some(r => r.type === 'CNAME' && String(r.content).toLowerCase() === DOMAIN && r.proxied === true);
    if (!ok) throw new Error(`Safety block: ${HOST} already has a conflicting DNS record`);
    log('DNS_PRESERVED', { count: records.length });
  }

  await deployWorker(zone.id);

  const routes = await cf(`/zones/${zone.id}/workers/routes`);
  const samePattern = (routes.result || []).find(r => r.pattern === ROUTE);
  if (samePattern && samePattern.script !== SERVICE) {
    throw new Error(`Safety block: route ${ROUTE} belongs to ${samePattern.script || 'another target'}`);
  }
  if (!samePattern) {
    await cf(`/zones/${zone.id}/workers/routes`, {
      method: 'POST',
      body: JSON.stringify({ pattern: ROUTE, script: SERVICE })
    });
    log('WORKER_ROUTE_CREATED', { pattern: ROUTE, service: SERVICE });
  } else {
    log('WORKER_ROUTE_PRESERVED', { pattern: ROUTE, service: SERVICE });
  }

  let last;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(`https://${HOST}/health`, { redirect: 'follow', headers: { accept: 'application/json' } });
      const text = await response.text();
      let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
      last = { attempt, status: response.status, body };
      if (response.ok && body?.status === 'READY' && body?.service === SERVICE) {
        log('DOMAIN_READY', { url: `https://${HOST}/health`, http: response.status, attempt });
        console.log(JSON.stringify({ status: 'DOMAIN_READY', domain: HOST, worker: SERVICE, verification: last }, null, 2));
        return;
      }
    } catch (error) {
      last = { attempt, error: error.message };
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error(`Verification failed: ${JSON.stringify(last)}`);
}

main().catch(error => {
  log('PILOT_FAILED', { error: error.message });
  process.exitCode = 1;
});
