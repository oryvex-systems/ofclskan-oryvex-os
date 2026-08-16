const LEVELS = Object.freeze({
  L1: 'L1',
  L2: 'L2',
  L3: 'L3'
});

const ACTIONS = Object.freeze({
  'CLO.ZONE.STATUS': LEVELS.L1,
  'CLO.NAMESERVERS.GET': LEVELS.L1,
  'DNS.SNAPSHOT': LEVELS.L1,
  'DNS.VERIFY': LEVELS.L1,
  'TLS.VERIFY': LEVELS.L1,
  'HTTPS.GET': LEVELS.L1,
  'WORKER.GET': LEVELS.L1,
  'WORKER.DOMAIN.CONNECT': LEVELS.L2,
  'WORKER.SCRIPT.DEPLOY': LEVELS.L2,
  'DNS.CREATE': LEVELS.L2,
  'DNS.UPDATE': LEVELS.L2,
  'DNS.DELETE': LEVELS.L2,
  'REGISTRAR.NAMESERVER.CHANGE': LEVELS.L3,
  'REGISTRAR.DOMAIN.TRANSFER': LEVELS.L3,
  'REGISTRAR.DOMAIN.DELETE': LEVELS.L3
});

export function classifyAction(action) {
  return ACTIONS[action] || LEVELS.L3;
}

export function authorize({ action, humanApproval = false, verified = false }) {
  const level = classifyAction(action);
  if (level === LEVELS.L1) return { allowed: true, level, verificationRequired: false };
  if (level === LEVELS.L2) return { allowed: true, level, verificationRequired: true };
  if (level === LEVELS.L3 && humanApproval) return { allowed: true, level, verificationRequired: true };
  return { allowed: false, level, verificationRequired: true, reason: 'HUMAN_APPROVAL_REQUIRED' };
}

export { LEVELS, ACTIONS };
