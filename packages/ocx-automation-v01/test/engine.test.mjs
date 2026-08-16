import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, authorize, runStep, LEVEL } from '../src/engine.mjs';

test('policy levels are safe by default', () => {
  assert.equal(classify('HEALTH.CHECK'), LEVEL.L1);
  assert.equal(classify('DEPLOY.APPLY'), LEVEL.L2);
  assert.equal(classify('NAMESERVER.CHANGE'), LEVEL.L3);
  assert.equal(classify('UNKNOWN.ACTION'), LEVEL.L3);
});

test('L2 requires explicit enable', () => {
  assert.equal(authorize({ action: 'DEPLOY.APPLY' }).ok, false);
  assert.equal(authorize({ action: 'DEPLOY.APPLY', allowL2: true }).ok, true);
});

test('L3 requires human approval', () => {
  assert.equal(authorize({ action: 'DOMAIN.TRANSFER', allowL2: true }).ok, false);
  assert.equal(authorize({ action: 'DOMAIN.TRANSFER', humanApproved: true }).ok, true);
});

test('step retries and verifies', async () => {
  let calls = 0;
  const result = await runStep({
    name: 'retry', action: 'HEALTH.CHECK', retries: 1,
    execute: async () => { calls += 1; if (calls === 1) throw new Error('temporary'); return { ok: true }; },
    verify: r => ({ ok: r.ok })
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.attempt, 2);
});
