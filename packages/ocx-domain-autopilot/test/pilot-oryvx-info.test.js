import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../pilots/oryvx.info.json'), 'utf8'));

test('oryvx.info pilot never mutates root or www baseline', () => {
  assert.equal(manifest.domain, 'oryvx.info');
  assert.equal(manifest.safety.no_root_change, true);
  assert.equal(manifest.safety.no_www_change, true);
  assert.equal(manifest.safety.no_delete, true);
  assert.equal(manifest.observed_baseline.records.length, 2);
  assert.ok(manifest.observed_baseline.records.every(r => r.policy === 'PRESERVE'));
});

test('oryvx.info pilot uses isolated proxied test hostname', () => {
  const dns = manifest.test_surface.dns_record;
  assert.equal(dns.name, 'ocx-test.oryvx.info');
  assert.equal(dns.type, 'CNAME');
  assert.equal(dns.content, 'oryvx.info');
  assert.equal(dns.proxied, true);
  assert.equal(manifest.test_surface.worker_route, 'ocx-test.oryvx.info/*');
});

test('oryvx.info pilot remains controlled R2 with verification and rollback', () => {
  assert.equal(manifest.mode, 'CONTROLLED_TEST');
  assert.equal(manifest.safety.risk, 'R2');
  assert.equal(manifest.safety.verify_required, true);
  assert.equal(manifest.safety.rollback, 'REMOVE_TEST_ROUTE_AND_TEST_CNAME_ONLY');
  assert.ok(manifest.readiness_checks.includes('HTTPS_VALID'));
  assert.ok(manifest.readiness_checks.includes('HTTP_200_HEALTH'));
});
