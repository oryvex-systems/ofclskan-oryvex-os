function assertPlanExecutable(plan) {
  if (!plan || !Array.isArray(plan.actions)) throw new Error('Invalid DNS plan');
  if (plan.safety?.decision !== 'ALLOW_WITH_VERIFY') throw new Error('DNS plan is not authorized for execution');
  if (!plan.verify_required) throw new Error('Verification is required');
}

export function compileExecutionBatch(plan) {
  assertPlanExecutable(plan);
  const commands = [];
  for (const action of plan.actions) {
    if (action.action === 'PRESERVE') continue;
    if (action.action === 'CREATE') {
      commands.push({ command: 'CLO.DNS.CREATE', risk: action.risk, record: action.next });
      continue;
    }
    if (action.action === 'UPDATE') {
      commands.push({ command: 'CLO.DNS.UPDATE', risk: action.risk, record_id: action.old?.id || null, record: action.next });
      continue;
    }
    if (action.action === 'REMOVE' || action.action === 'REVIEW') {
      throw new Error(`Destructive or reviewed DNS action not executable in v0.1: ${action.action}`);
    }
  }
  return {
    plan_id: plan.plan_id,
    domain: plan.domain,
    mode: 'CONTROLLED',
    verify_required: true,
    commands
  };
}

export async function executeDnsBatch({ batch, connector }) {
  if (!batch?.verify_required) throw new Error('Unsafe batch: verification missing');
  if (!connector?.createDnsRecord || !connector?.updateDnsRecord) throw new Error('Connector contract incomplete');
  const results = [];
  for (const item of batch.commands) {
    if (item.command === 'CLO.DNS.CREATE') {
      results.push({ command: item.command, result: await connector.createDnsRecord(item.record) });
    } else if (item.command === 'CLO.DNS.UPDATE') {
      if (!item.record_id) throw new Error('DNS update requires record_id');
      results.push({ command: item.command, result: await connector.updateDnsRecord(item.record_id, item.record) });
    } else {
      throw new Error(`Unsupported command: ${item.command}`);
    }
  }
  return { executed: true, verify_required: true, results };
}

export function verifyDnsState({ desiredRecords = [], observedRecords = [] }) {
  const key = r => [String(r.type || '').toUpperCase(), String(r.name || '').toLowerCase(), String(r.content || ''), r.priority ?? ''].join('|');
  const observed = new Set(observedRecords.map(key));
  const missing = desiredRecords.filter(r => !observed.has(key(r)));
  return {
    status: missing.length ? 'VERIFY_FAILED' : 'VERIFIED',
    success: missing.length === 0,
    missing
  };
}

export function verifyDomainReady({ dns, ssl, http, worker, mail }) {
  const checks = { dns, ssl, http, worker, mail };
  const failures = Object.entries(checks).filter(([, value]) => value !== true).map(([name]) => name);
  return {
    status: failures.length ? 'DOMAIN_NOT_READY' : 'DOMAIN_READY',
    success: failures.length === 0,
    failures,
    checks
  };
}
