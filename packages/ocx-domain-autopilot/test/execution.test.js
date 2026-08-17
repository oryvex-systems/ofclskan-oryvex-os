import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDnsPlan, compileExecutionBatch, verifyDnsState, verifyDomainReady } from '../src/index.js';

test('safe plan compiles to controlled CLO DNS create command', () => {
  const plan = buildDnsPlan({
    domain: 'oryvex.com.tr',
    currentRecords: [],
    desiredRecords: [{ type: 'CNAME', name: 'www.oryvex.com.tr', content: 'origin.example.com', proxied: true }],
    rollbackAvailable: true
  });
  const batch = compileExecutionBatch(plan);
  assert.equal(batch.mode, 'CONTROLLED');
  assert.equal(batch.verify_required, true);
  assert.equal(batch.commands.length, 1);
  assert.equal(batch.commands[0].command, 'CLO.DNS.CREATE');
});

test('blocked mail plan cannot compile for execution', () => {
  const plan = buildDnsPlan({
    domain: 'oryvex.com.tr',
    currentRecords: [{ type: 'MX', name: 'oryvex.com.tr', content: 'mail.old', priority: 10 }],
    desiredRecords: [],
    rollbackAvailable: true
  });
  assert.throws(() => compileExecutionBatch(plan), /not authorized/);
});

test('dns verification requires exact desired records', () => {
  const desired = [{ type: 'A', name: 'oryvex.com.tr', content: '192.0.2.5' }];
  assert.equal(verifyDnsState({ desiredRecords: desired, observedRecords: desired }).status, 'VERIFIED');
  assert.equal(verifyDnsState({ desiredRecords: desired, observedRecords: [] }).status, 'VERIFY_FAILED');
});

test('domain ready requires dns ssl http worker and mail', () => {
  assert.equal(verifyDomainReady({ dns: true, ssl: true, http: true, worker: true, mail: true }).status, 'DOMAIN_READY');
  const bad = verifyDomainReady({ dns: true, ssl: true, http: true, worker: false, mail: true });
  assert.equal(bad.status, 'DOMAIN_NOT_READY');
  assert.deepEqual(bad.failures, ['worker']);
});
