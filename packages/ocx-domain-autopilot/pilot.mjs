import fs from 'node:fs/promises';
import { snapshot, attachWorkerDomain } from './cloudflare.mjs';

const config = JSON.parse(await fs.readFile(new URL('./pilot.sozundeusta.json', import.meta.url), 'utf8'));
const mode = process.env.OCX_MODE || 'plan';

function audit(event, data = {}) {
  const safe = JSON.parse(JSON.stringify(data, (key, value) => {
    if (/token|secret|password|auth.?code|epp/i.test(key)) return '[REDACTED]';
    return value;
  }));
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...safe }));
}

function desiredAttachment(snapshotData) {
  return snapshotData.workerDomains?.find(x => x.hostname === config.domain && x.service === config.workerService);
}

async function verifyHttps(url) {
  const response = await fetch(url, { redirect: 'follow' });
  return {
    ok: response.ok,
    status: response.status,
    finalUrl: response.url
  };
}

async function main() {
  audit('PILOT_START', { project: config.project, domain: config.domain, mode });
  const before = await snapshot(config.domain);
  audit('SNAPSHOT', {
    zoneStatus: before.zone.status,
    nameServers: before.zone.nameServers,
    dnsCount: before.dns.length,
    workerDomainCount: before.workerDomains.length
  });

  if (before.zone.status !== 'active') {
    throw new Error(`Zone is not active: ${before.zone.status}`);
  }

  let attachment = desiredAttachment(before);
  if (!attachment) {
    audit('PLAN_ACTION', {
      action: 'CLO.WORKER.DOMAIN.CONNECT',
      hostname: config.domain,
      service: config.workerService,
      policy: 'L2'
    });

    if (mode === 'apply') {
      const accountId = process.env.CLO_ACCOUNT_ID;
      await attachWorkerDomain({
        accountId,
        hostname: config.domain,
        service: config.workerService,
        zoneId: before.zone.id,
        zoneName: before.zone.name
      });
      audit('ACTION_EXECUTED', { action: 'CLO.WORKER.DOMAIN.CONNECT' });
    }
  }

  if (mode === 'apply') {
    const after = await snapshot(config.domain);
    attachment = desiredAttachment(after);
    if (!attachment) throw new Error('Worker custom-domain attachment verification failed');

    const https = await verifyHttps(config.canonicalUrl);
    audit('HTTPS_VERIFY', https);
    if (!https.ok) throw new Error(`HTTPS verification failed with status ${https.status}`);

    audit('PILOT_PASS', {
      project: config.project,
      domain: config.domain,
      workerService: config.workerService
    });
  } else {
    audit('PLAN_COMPLETE', { message: 'No mutation executed. Set OCX_MODE=apply after L2 authorization policy is satisfied.' });
  }
}

main().catch(error => {
  audit('PILOT_FAIL', { error: error.message });
  process.exitCode = 1;
});
