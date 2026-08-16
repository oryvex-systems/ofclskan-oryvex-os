export default {
  async fetch(request) {
    const url = new URL(request.url);
    const build = 'OCX-V0.1-PILOT-2026-08-17';

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        system: 'SOZUNDE-USTA',
        pilot: true,
        build,
        status: 'READY'
      }, { headers: { 'cache-control': 'no-store' } });
    }

    const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SÖZÜNDE USTA | OCX Pilot</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#111;color:#fff;display:grid;min-height:100vh;place-items:center}.card{max-width:720px;padding:48px;border:1px solid #333;border-radius:24px;background:#181818;box-shadow:0 20px 60px #0008}h1{font-size:clamp(42px,8vw,82px);margin:0 0 12px}p{color:#bbb;line-height:1.6}.badge{display:inline-block;padding:8px 12px;border:1px solid #555;border-radius:999px;font-size:13px}.ok{margin-top:28px;font-weight:700}code{color:#ddd}</style>
</head>
<body><main class="card"><span class="badge">OCX DOPLT • TEST YAYINI</span><h1>SÖZÜNDE USTA</h1><p>Bu sayfa OCX v0.1 deploy, health-check, sürüm doğrulama ve rollback otomasyonu için pilot yayındır.</p><div class="ok">STATUS: READY ✓</div><p><code>${build}</code></p></main></body></html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'no-store',
        'x-ocx-build': build
      }
    });
  }
};
