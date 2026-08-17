import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdempotencyKey, createIdempotencyStore, withRetry, createDeadLetterQueue, executeIdempotent } from '../src/resilience.js';

test('idempotency key is stable for same DNS command', () => {
  const input = { domain: 'oryvex.com.tr', planId: 'P1', command: 'CLO.DNS.CREATE', record: { type: 'A', name: 'oryvex.com.tr', content: '192.0.2.10' } };
  assert.equal(createIdempotencyKey(input), createIdempotencyKey(input));
});

test('executeIdempotent does not run the same operation twice', async () => {
  const store = createIdempotencyStore();
  let count = 0;
  const op = async () => ({ count: ++count });
  const first = await executeIdempotent({ key: 'same', store, operation: op });
  const second = await executeIdempotent({ key: 'same', store, operation: op });
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(count, 1);
});

test('retry succeeds after transient failures', async () => {
  let tries = 0;
  const result = await withRetry(async () => {
    tries += 1;
    if (tries < 3) throw new Error('temporary');
    return 'ok';
  }, { maxAttempts: 3 });
  assert.equal(result.success, true);
  assert.equal(result.attempts, 3);
  assert.equal(result.result, 'ok');
});

test('non-retryable failure stops immediately', async () => {
  const result = await withRetry(async () => { throw new Error('fatal'); }, { maxAttempts: 5, retryable: () => false });
  assert.equal(result.success, false);
  assert.equal(result.attempts, 5);
  assert.equal(result.error, 'fatal');
});

test('dead letter queue keeps unresolved failures auditable', () => {
  const dlq = createDeadLetterQueue();
  const item = dlq.push({ domain: 'oryvex.com.tr', reason: 'VERIFY_FAILED' });
  assert.equal(dlq.list().length, 1);
  assert.equal(item.status, 'OPEN');
  dlq.resolve(item.id, 'manual review completed');
  assert.equal(dlq.list()[0].status, 'RESOLVED');
});
