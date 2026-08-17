export function createAuditEntry({
  domain,
  phase,
  action,
  risk = 'R0',
  actor = 'OCX',
  target = null,
  result = null,
  status = 'INFO',
  correlationId = null,
  at = new Date().toISOString()
}) {
  if (!domain) throw new Error('audit domain is required');
  if (!phase) throw new Error('audit phase is required');
  if (!action) throw new Error('audit action is required');
  return {
    audit_id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    correlation_id: correlationId,
    domain,
    phase,
    action,
    risk,
    actor,
    target,
    result,
    status,
    at
  };
}

export function createAuditLedger({ domain, correlationId = `DOM-${Date.now()}` } = {}) {
  if (!domain) throw new Error('domain is required');
  const entries = [];
  return {
    domain,
    correlation_id: correlationId,
    append(input) {
      const entry = createAuditEntry({ domain, correlationId, ...input });
      entries.push(entry);
      return entry;
    },
    list() {
      return [...entries];
    },
    summary() {
      const blocked = entries.filter(e => e.status === 'BLOCKED').length;
      const failed = entries.filter(e => e.status === 'FAILED').length;
      return {
        domain,
        correlation_id: correlationId,
        total: entries.length,
        blocked,
        failed,
        ok: blocked === 0 && failed === 0
      };
    }
  };
}
