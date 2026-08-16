import { listZones, snapshot } from './cloudflare.mjs';

function classify(zone) {
  if (zone.status === 'active') return 'ACTIVE';
  if (zone.status === 'pending') return 'PENDING';
  if (zone.status === 'moved') return 'MOVED';
  return String(zone.status || 'UNKNOWN').toUpperCase();
}

export async function discoverInventory() {
  const zones = await listZones();
  const results = [];

  for (const zone of zones) {
    let details = null;
    let error = null;
    try {
      details = await snapshot(zone.name);
    } catch (e) {
      error = e?.message || String(e);
    }

    results.push({
      domain: zone.name,
      zoneId: zone.id,
      state: classify(zone),
      assignedNameServers: zone.name_servers || [],
      originalNameServers: zone.original_name_servers || [],
      dnsRecordCount: details?.dns?.length ?? null,
      workerDomains: (details?.workerDomains || [])
        .filter(x => x.zone_id === zone.id || x.hostname === zone.name)
        .map(x => ({ hostname: x.hostname, service: x.service })),
      error
    });
  }

  return {
    system: 'OCX-DOPLT',
    generatedAt: new Date().toISOString(),
    total: results.length,
    active: results.filter(x => x.state === 'ACTIVE').length,
    pending: results.filter(x => x.state === 'PENDING').length,
    zones: results
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  discoverInventory()
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => {
      console.error(JSON.stringify({ system: 'OCX-DOPLT', status: 'ERROR', error: err.message }));
      process.exitCode = 1;
    });
}
