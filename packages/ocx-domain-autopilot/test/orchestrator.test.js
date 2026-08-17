import test from 'node:test';
import assert from 'node:assert/strict';
import { runDomainAutopilot } from '../src/orchestrator.js';

function adapter(initial = []) {
  const records = [...initial];
  return {
    async listDnsRecords() { return records; },
    async createDnsRecord(record) { records.push({ id: `id-${records.length + 1}`, ...record }); return { success: true }; },
    async updateDnsRecord(id, record) { const i = records.findIndex(r => r.id === id); if (i >= 0) records[i] = { id, ...record }; return { success: true }; },
    async verifySsl() { return true; },
    async verifyHttp() { return true; },
    async verifyWorker() { return true; },
    async verifyMail() { return true; }
  };
}

test('autopilot reaches DOMAIN_READY for safe additive DNS plan', async () => {
  const desired = [{ type: 'CNAME', name: 'www.oryvex.com.tr', content: 'origin.example.com', proxied: true }];
  const result = await runDomainAutopilot({ domain: 'oryvex.com.tr', desiredRecords: desired, adapter: adapter([]) });
  assert.equal(result.status, 'DOMAIN_READY');
  assert.equal(result.success, true);
  assert.ok(result.history.some(h => h.state === 'VERIFYING'));
});

test('autopilot blocks mail removal before execution', async () => {
  const current = [{ id: 'mx1', type: 'MX', name: 'oryvex.com.tr', content: 'mail.example.com', priority: 10 }];
  const result = await runDomainAutopilot({ domain: 'oryvex.com.tr', desiredRecords: [], adapter: adapter(current) });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.success, false);
  assert.ok(result.history.some(h => h.state === 'BLOCKED'));
});
