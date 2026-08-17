import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuditLedger, buildRecoveryPlan } from '../src/index.js';
import { runDomainAutopilot } from '../src/orchestrator.js';

function failingReadinessAdapter() {
  const records = [];
  return {
    async listDnsRecords() { return records; },
    async createDnsRecord(record) { records.push({ id: `id-${records.length + 1}`, ...record }); return { success: true }; },
    async updateDnsRecord(id, record) { const i = records.findIndex(r => r.id === id); if (i >= 0) records[i] = { id, ...record }; return { success: true }; },
    async verifySsl() { return true; },
    async verifyHttp() { return false; },
    async verifyWorker() { return true; },
    async verifyMail() { return true; }
  };
}

test('audit ledger preserves correlation id and summary', () => {
  const ledger = createAuditLedger({ domain: 'oryvex.com.tr', correlationId: 'DOM-TEST-1' });
  ledger.append({ phase: 'REQUESTED', action: 'DOMAIN.REQUEST' });
  ledger.append({ phase: 'BLOCKED', action: 'DNS.PLAN.BLOCK', status: 'BLOCKED', risk: 'R3' });
  assert.equal(ledger.list().length, 2);
  assert.equal(ledger.list()[0].correlation_id, 'DOM-TEST-1');
  assert.equal(ledger.summary().blocked, 1);
  assert.equal(ledger.summary().ok, false);
});

test('recovery plan never auto executes rollback', () => {
  const recovery = buildRecoveryPlan({
    domain: 'oryvex.com.tr',
    snapshot: { snapshot_id: 'DNS-1', dns_records: [] },
    plan: { rollback: 'AVAILABLE' },
    readiness: { status: 'DOMAIN_NOT_READY', failures: ['http'] }
  });
  assert.equal(recovery.status, 'RECOVERY_PLAN_READY');
  assert.equal(recovery.auto_execute, false);
  assert.ok(recovery.actions.some(a => a.action === 'PROPOSE_ROLLBACK' && a.mode === 'APPROVAL_REQUIRED'));
});

test('autopilot returns audit and recovery when readiness fails', async () => {
  const desired = [{ type: 'CNAME', name: 'www.oryvex.com.tr', content: 'origin.example.com', proxied: true }];
  const result = await runDomainAutopilot({ domain: 'oryvex.com.tr', desiredRecords: desired, adapter: failingReadinessAdapter() });
  assert.equal(result.status, 'DOMAIN_NOT_READY');
  assert.equal(result.success, false);
  assert.ok(Array.isArray(result.audit));
  assert.ok(result.audit.length > 0);
  assert.equal(result.recovery.auto_execute, false);
  assert.ok(result.history.some(h => h.state === 'RECOVERY_PLAN_READY'));
});
