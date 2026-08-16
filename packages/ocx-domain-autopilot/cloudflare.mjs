const API = 'https://api.cloudflare.com/client/v4';

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function cf(path, init = {}) {
  const token = env('CLO_API_TOKEN');
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    const message = body?.errors?.map(e => e.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(`CLO API error: ${message}`);
  }
  return body.result;
}

async function cfRaw(path, init = {}) {
  const token = env('CLO_API_TOKEN');
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }

  if (!response.ok || body.success === false) {
    const message = body?.errors?.map(e => e.message).join('; ') || `HTTP ${response.status}`;
    throw new Error(`CLO API error: ${message}`);
  }
  return body.result ?? body;
}

export async function verifyToken() {
  return cf('/user/tokens/verify');
}

export async function listZones() {
  const result = [];
  let page = 1;
  while (true) {
    const response = await fetch(`${API}/zones?per_page=50&page=${page}`, {
      headers: { Authorization: `Bearer ${env('CLO_API_TOKEN')}` }
    });
    const body = await response.json();
    if (!response.ok || body.success === false) {
      const message = body?.errors?.map(e => e.message).join('; ') || `HTTP ${response.status}`;
      throw new Error(`CLO API error: ${message}`);
    }
    result.push(...(body.result || []));
    const totalPages = body.result_info?.total_pages || 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return result;
}

export async function findZone(domain) {
  const zones = await cf(`/zones?name=${encodeURIComponent(domain)}`);
  return zones?.[0] || null;
}

export async function listDns(zoneId) {
  return cf(`/zones/${zoneId}/dns_records?per_page=500`);
}

export async function listWorkerDomains(accountId) {
  return cf(`/accounts/${accountId}/workers/domains`);
}

export async function attachWorkerDomain({ accountId, hostname, service, zoneId, zoneName }) {
  return cf(`/accounts/${accountId}/workers/domains`, {
    method: 'PUT',
    body: JSON.stringify({ hostname, service, zone_id: zoneId, zone_name: zoneName })
  });
}

export async function getWorkerScript(accountId, service) {
  return cfRaw(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(service)}`);
}

export async function deployWorkerModule({ accountId, service, source, compatibilityDate = '2026-08-17' }) {
  const boundary = `----ocx-${crypto.randomUUID()}`;
  const metadata = {
    main_module: 'worker.js',
    compatibility_date: compatibilityDate
  };
  const body = [
    `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n${source}\r\n`,
    `--${boundary}--\r\n`
  ].join('');

  return cfRaw(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(service)}`, {
    method: 'PUT',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });
}

export async function snapshot(domain) {
  const accountId = env('CLO_ACCOUNT_ID');
  const zone = await findZone(domain);
  if (!zone) throw new Error(`CLO zone not found for ${domain}`);
  const [dns, workerDomains] = await Promise.all([
    listDns(zone.id),
    listWorkerDomains(accountId)
  ]);
  return {
    zone: {
      id: zone.id,
      name: zone.name,
      status: zone.status,
      nameServers: zone.name_servers || []
    },
    dns,
    workerDomains
  };
}
