import fs from 'node:fs/promises';
import { deployWorkerModule } from './cloudflare.mjs';

const accountId = process.env.CLO_ACCOUNT_ID;
const service = process.env.OCX_DOPLT_SERVICE || 'ocx-doplt';

if (!accountId) throw new Error('Missing CLO_ACCOUNT_ID');
if (!process.env.CLO_API_TOKEN) throw new Error('Missing CLO_API_TOKEN');

const source = await fs.readFile(new URL('./worker/ocx-doplt-worker.js', import.meta.url), 'utf8');

const result = await deployWorkerModule({
  accountId,
  service,
  source,
  compatibilityDate: process.env.CLO_COMPATIBILITY_DATE || '2026-08-17'
});

console.log(JSON.stringify({
  system: 'OCX-DOPLT',
  action: 'WORKER.SCRIPT.DEPLOY',
  service,
  status: 'DEPLOYED',
  result
}, null, 2));
