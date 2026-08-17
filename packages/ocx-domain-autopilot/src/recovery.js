export function buildRecoveryPlan({ domain, snapshot, plan, readiness, error = null }) {
  if (!domain) throw new Error('domain is required');
  const actions = [];

  if (readiness?.status === 'DOMAIN_NOT_READY') {
    for (const failure of readiness.failures || []) {
      actions.push({
        action: 'RECHECK',
        target: failure,
        mode: 'SAFE',
        destructive: false
      });
    }
  }

  if (error) {
    actions.push({
      action: 'DIAGNOSE',
      target: 'LAST_ERROR',
      mode: 'SAFE',
      destructive: false,
      detail: String(error)
    });
  }

  const rollbackPossible = Boolean(snapshot?.dns_records && plan?.rollback === 'AVAILABLE');
  if (rollbackPossible && (readiness?.status === 'DOMAIN_NOT_READY' || error)) {
    actions.push({
      action: 'PROPOSE_ROLLBACK',
      target: 'DNS_SNAPSHOT',
      snapshot_id: snapshot.snapshot_id,
      mode: 'APPROVAL_REQUIRED',
      destructive: false
    });
  }

  return {
    recovery_id: `REC-${Date.now()}`,
    domain,
    status: actions.length ? 'RECOVERY_PLAN_READY' : 'NO_RECOVERY_REQUIRED',
    auto_execute: false,
    actions
  };
}
