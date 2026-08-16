export const LEVEL = Object.freeze({ L1: 'L1', L2: 'L2', L3: 'L3' });

const policy = Object.freeze({
  'HEALTH.CHECK': LEVEL.L1,
  'APP.SMOKE.TEST': LEVEL.L1,
  'DEPLOY.PLAN': LEVEL.L1,
  'DEPLOY.APPLY': LEVEL.L2,
  'DEPLOY.VERIFY': LEVEL.L1,
  'VERSION.RELEASE': LEVEL.L2,
  'ROLLBACK.APPLY': LEVEL.L2,
  'DNS.READ': LEVEL.L1,
  'DNS.WRITE': LEVEL.L2,
  'NAMESERVER.CHANGE': LEVEL.L3,
  'DOMAIN.TRANSFER': LEVEL.L3
});

export function classify(action) {
  return policy[action] || LEVEL.L3;
}

export function authorize({ action, allowL2 = false, humanApproved = false }) {
  const level = classify(action);
  if (level === LEVEL.L1) return { ok: true, level };
  if (level === LEVEL.L2) return { ok: !!allowL2, level, reason: allowL2 ? null : 'L2_NOT_ENABLED' };
  return { ok: !!humanApproved, level, reason: humanApproved ? null : 'HUMAN_APPROVAL_REQUIRED' };
}

export async function runStep({ name, action, execute, verify, allowL2 = false, humanApproved = false, retries = 1 }) {
  const auth = authorize({ action, allowL2, humanApproved });
  const startedAt = new Date().toISOString();
  if (!auth.ok) return { name, action, status: 'BLOCKED', level: auth.level, reason: auth.reason, startedAt };

  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const result = await execute();
      const verification = verify ? await verify(result) : { ok: true };
      if (!verification?.ok) throw new Error(verification?.reason || 'VERIFY_FAILED');
      return { name, action, status: 'PASS', level: auth.level, attempt, startedAt, finishedAt: new Date().toISOString(), result, verification };
    } catch (error) {
      lastError = error;
    }
  }
  return { name, action, status: 'FAIL', level: auth.level, startedAt, finishedAt: new Date().toISOString(), error: String(lastError?.message || lastError) };
}

export async function runPipeline(steps, context = {}) {
  const report = { system: 'OCX', version: '0.1.0', status: 'RUNNING', startedAt: new Date().toISOString(), steps: [] };
  for (const step of steps) {
    const result = await runStep({ ...step, ...context });
    report.steps.push(result);
    if (result.status === 'FAIL' || result.status === 'BLOCKED') {
      report.status = result.status;
      report.finishedAt = new Date().toISOString();
      return report;
    }
  }
  report.status = 'PASS';
  report.finishedAt = new Date().toISOString();
  return report;
}
