import { runPipeline } from './engine.mjs';

const DOPLT = process.env.OCX_DOPLT_URL || 'https://ocx-doplt.oryvex-core.workers.dev';
const APP = process.env.OCX_PILOT_URL || 'https://sozundeusta.com.tr';

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' }, redirect: 'follow' });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}: ${JSON.stringify(body)}`);
  return { status: res.status, url: res.url, body };
}

async function getHttp(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return { status: res.status, ok: res.ok, url: res.url };
}

const steps = [
  {
    name: 'DOPLT health', action: 'HEALTH.CHECK', retries: 1,
    execute: () => getJson(`${DOPLT}/health`),
    verify: r => ({ ok: r.body?.status === 'READY', reason: `DOPLT status=${r.body?.status}` })
  },
  {
    name: 'DOPLT plan', action: 'DEPLOY.PLAN', retries: 1,
    execute: () => getJson(`${DOPLT}/plan?domain=sozundeusta.com.tr&worker=sozunde-usta`),
    verify: r => ({ ok: r.body?.mode === 'PLAN', reason: `mode=${r.body?.mode}` })
  },
  {
    name: 'Pilot app smoke', action: 'APP.SMOKE.TEST', retries: 1,
    execute: () => getHttp(APP),
    verify: r => ({ ok: r.ok, reason: `HTTP ${r.status}` })
  }
];

const report = await runPipeline(steps);
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
