const SERVICE = 'orxlab';
const DOMAIN = 'oryvx.com.tr';
const HOST = 'lab.oryvx.com.tr';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-oryvex-service': SERVICE,
      'x-oryvex-domain': DOMAIN
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({
        system: 'ORYVEX',
        service: 'ORXLAB',
        domain: HOST,
        status: 'READY',
        runtime: 'cloudflare-workers',
        mode: 'SANDBOX',
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === '/v1/capabilities') {
      return json({
        service: 'ORXLAB',
        capabilities: [
          'AI model experiments',
          'integration testing',
          'prototype validation',
          'provider comparison',
          'workflow simulation',
          'pre-production verification'
        ],
        production_changes_allowed: false
      });
    }

    return json({
      system: 'ORYVEX',
      service: 'ORXLAB',
      status: 'READY',
      message: 'ORYVEX experimental and integration laboratory.',
      endpoints: {
        health: '/health',
        capabilities: '/v1/capabilities'
      },
      policy: 'Experiments only. Production mutations require OCX approval.'
    });
  }
};
