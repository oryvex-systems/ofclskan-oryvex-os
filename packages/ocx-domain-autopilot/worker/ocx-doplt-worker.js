import { buildDnsPlan, createDnsSnapshot } from '../src/index.js';

const SERVICE = 'ocx-doplt';
const DOMAIN = 'oryvx.online';
const HOST = 'doplt.oryvx.online';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-ocx-service': SERVICE,
      'x-ocx-domain': DOMAIN
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({
        system: 'OCX',
        service: SERVICE,
        domain: HOST,
        status: 'READY',
        mode: 'CONTROLLED_AUTONOMY',
        runtime: 'cloudflare-workers',
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === '/v1/snapshot' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      return json(createDnsSnapshot({
        domain: body.domain || DOMAIN,
        registrar: body.registrar || null,
        nameservers: body.nameservers || [],
        records: body.records || []
      }));
    }

    if (url.pathname === '/v1/plan' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (!body.domain) return json({ error: 'domain is required' }, 400);
      return json(buildDnsPlan({
        domain: body.domain,
        currentRecords: body.currentRecords || [],
        desiredRecords: body.desiredRecords || [],
        rollbackAvailable: body.rollbackAvailable !== false
      }));
    }

    return json({
      system: 'OCX',
      service: SERVICE,
      status: 'READY',
      mode: 'CONTROLLED_AUTONOMY',
      message: 'OCX Domain Autopilot service endpoint.',
      endpoints: {
        health: '/health',
        dns_snapshot: 'POST /v1/snapshot',
        dns_plan: 'POST /v1/plan'
      },
      safety: 'DNS mutation is not exposed from the public Worker surface.'
    });
  }
};
