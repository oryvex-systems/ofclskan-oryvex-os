import test from 'node:test';
import assert from 'node:assert/strict';
import { createDnsSnapshot, diffDns, runDnsSafety, buildDnsPlan } from '../src/index.js';

test('snapshot separates mail and verification records', () => {
  const snapshot = createDnsSnapshot({
    domain: 'oryvex.com.tr',
    registrar: 'TEST',
    nameservers: ['ns1.example','ns2.example'],
    records: [
      { type: 'A', name: 'oryvex.com.tr', content: '192.0.2.10', proxied: true },
      { type: 'MX', name: 'oryvex.com.tr', content: 'mail.example.com', priority: 10 },
      { type: 'TXT', name: 'oryvex.com.tr', content: 'v=spf1 include:_spf.example ~all' },
      { type: 'TXT', name: 'oryvex.com.tr', content: 'google-site-verification=abc' }
    ]
  });
  assert.equal(snapshot.mail_records.length, 2);
  assert.equal(snapshot.verification_records.length, 1);
  assert.equal(snapshot.current_nameservers.length, 2);
});

test('mail update is never treated as ordinary R2 update', () => {
  const actions = diffDns(
    [{ type: 'MX', name: 'oryvex.com.tr', content: 'old.mail', priority: 10 }],
    [{ type: 'MX', name: 'oryvex.com.tr', content: 'new.mail', priority: 10 }]
  );
  assert.equal(actions[0].action, 'UPDATE');
  assert.equal(actions[0].risk, 'R3_REVIEW');
});

test('mail removal blocks change', () => {
  const current = [{ type: 'MX', name: 'oryvex.com.tr', content: 'mail.example.com', priority: 10 }];
  const actions = diffDns(current, []);
  const safety = runDnsSafety({ domain: 'oryvex.com.tr', currentRecords: current, plannedActions: actions, rollbackAvailable: true });
  assert.equal(safety.decision, 'BLOCK_CHANGE');
  assert.ok(safety.findings.some(f => f.code === 'MAIL_RISK_DETECTED'));
});

test('safe additive web record plan requires verification', () => {
  const plan = buildDnsPlan({
    domain: 'oryvex.com.tr',
    currentRecords: [],
    desiredRecords: [{ type: 'CNAME', name: 'www.oryvex.com.tr', content: 'origin.example.com', proxied: true }],
    rollbackAvailable: true
  });
  assert.equal(plan.safety.decision, 'ALLOW_WITH_VERIFY');
  assert.equal(plan.verify_required, true);
});
