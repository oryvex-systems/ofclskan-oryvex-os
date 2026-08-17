export default {
  async fetch(request) {
    const url = new URL(request.url);
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-ocx-test': 'oryvx.info'
    };

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        system: 'OCX',
        service: 'ocx-test',
        domain: 'ocx-test.oryvx.info',
        status: 'READY',
        runtime: 'cloudflare-workers',
        timestamp: new Date().toISOString()
      }, null, 2), { status: 200, headers });
    }

    return new Response(JSON.stringify({
      system: 'OCX',
      service: 'ocx-test',
      status: 'READY',
      message: 'ORYVEX CORE Cloudflare pilot is active.',
      health: '/health'
    }, null, 2), { status: 200, headers });
  }
};
