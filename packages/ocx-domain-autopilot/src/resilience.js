export function createIdempotencyKey({ domain, planId, command, record = {}, recordId = null }) {
  const parts = [
    String(domain || '').toLowerCase(),
    String(planId || ''),
    String(command || ''),
    String(recordId || ''),
    String(record.type || '').toUpperCase(),
    String(record.name || '').toLowerCase(),
    String(record.content || ''),
    String(record.priority ?? '')
  ];
  return parts.join('|');
}

export function createIdempotencyStore() {
  const completed = new Map();
  return {
    has(key) { return completed.has(key); },
    get(key) { return completed.get(key) || null; },
    set(key, value) { completed.set(key, value); return value; },
    size() { return completed.size; }
  };
}

export async function withRetry(operation, {
  maxAttempts = 3,
  retryable = () => true,
  onAttempt = () => {}
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      onAttempt({ attempt, status: 'STARTED' });
      const result = await operation(attempt);
      onAttempt({ attempt, status: 'SUCCEEDED' });
      return { success: true, attempts: attempt, result };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxAttempts && retryable(error, attempt);
      onAttempt({ attempt, status: canRetry ? 'RETRYING' : 'FAILED', error: error.message });
      if (!canRetry) break;
    }
  }
  return { success: false, attempts: maxAttempts, error: lastError?.message || 'unknown error' };
}

export function createDeadLetterQueue() {
  const items = [];
  return {
    push(entry) {
      const item = {
        id: `DLQ-${Date.now()}-${items.length + 1}`,
        created_at: new Date().toISOString(),
        status: 'OPEN',
        ...entry
      };
      items.push(item);
      return item;
    },
    list() { return [...items]; },
    resolve(id, resolution) {
      const item = items.find(x => x.id === id);
      if (!item) return null;
      item.status = 'RESOLVED';
      item.resolution = resolution;
      item.resolved_at = new Date().toISOString();
      return item;
    }
  };
}

export async function executeIdempotent({ key, store, operation }) {
  if (!key) throw new Error('Idempotency key is required');
  if (!store?.has || !store?.get || !store?.set) throw new Error('Idempotency store contract incomplete');
  if (store.has(key)) return { replayed: true, value: store.get(key) };
  const value = await operation();
  store.set(key, value);
  return { replayed: false, value };
}
