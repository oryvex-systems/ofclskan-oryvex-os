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
