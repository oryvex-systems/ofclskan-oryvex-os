const MAIL_TYPES = new Set(['MX']);
const MAIL_NAME_HINTS = ['_dmarc', '_domainkey', 'autodiscover', 'mail'];
const VERIFICATION_HINTS = ['verification', 'google-site-verification', 'ms=', 'stripe-verification'];

function normalizeRecord(record = {}) {
  return {
    id: record.id || null,
    type: String(record.type || '').toUpperCase(),
    name: String(record.name || '').toLowerCase(),
    content: String(record.content || ''),
    ttl: Number(record.ttl ?? 1),
    proxied: Boolean(record.proxied),
    priority: record.priority == null ? null : Number(record.priority),
    comment: record.comment || null
  };
}

function recordKey(record) {
  const r = normalizeRecord(record);
  return [r.type, r.name, r.content, r.priority ?? ''].join('|');
}

function isMailRecord(record) {
  const r = normalizeRecord(record);
  if (MAIL_TYPES.has(r.type)) return true;
  const name = r.name.toLowerCase();
  const content = r.content.toLowerCase();
  if (r.type === 'TXT' && (content.startsWith('v=spf1') || name.includes('_dmarc') || name.includes('_domainkey'))) return true;
  if (['CNAME','TXT'].includes(r.type) && MAIL_NAME_HINTS.some(h => name.includes(h))) return true;
  return false;
}

function isVerificationRecord(record) {
  const r = normalizeRecord(record);
  const hay = `${r.name} ${r.content}`.toLowerCase();
  return r.type === 'TXT' && VERIFICATION_HINTS.some(h => hay.includes(h));
}

export function createDnsSnapshot({ domain, registrar = null, nameservers = [], records = [], snapshotId, timestamp = new Date().toISOString() }) {
  const dnsRecords = records.map(normalizeRecord);
  const mailRecords = dnsRecords.filter(isMailRecord);
  const verificationRecords = dnsRecords.filter(isVerificationRecord);
  const knownSubdomains = [...new Set(dnsRecords.map(r => r.name).filter(n => n && n !== domain && n !== `www.${domain}`))].sort();
  const originTargets = [...new Set(dnsRecords.filter(r => ['A','AAAA','CNAME'].includes(r.type)).map(r => r.content))];

  return {
    snapshot_id: snapshotId || `DNS-${Date.now()}`,
    domain,
    timestamp,
    registrar,
    current_nameservers: [...nameservers],
    dns_records: dnsRecords,
    mail_records: mailRecords,
    proxy_status: dnsRecords.filter(r => ['A','AAAA','CNAME'].includes(r.type)).map(r => ({ type: r.type, name: r.name, proxied: r.proxied })),
    ttl_values: dnsRecords.map(r => ({ type: r.type, name: r.name, ttl: r.ttl })),
    origin_targets: originTargets,
    verification_records: verificationRecords,
    known_subdomains: knownSubdomains
  };
}

export function diffDns(oldRecords = [], desiredRecords = []) {
  const oldNorm = oldRecords.map(normalizeRecord);
  const desiredNorm = desiredRecords.map(normalizeRecord);
  const oldByKey = new Map(oldNorm.map(r => [recordKey(r), r]));
  const desiredByKey = new Map(desiredNorm.map(r => [recordKey(r), r]));
  const actions = [];

  for (const desired of desiredNorm) {
    const key = recordKey(desired);
    if (oldByKey.has(key)) {
      actions.push({ action: 'PRESERVE', risk: 'R0', old: oldByKey.get(key), next: desired, rollback: 'NOT_REQUIRED' });
      continue;
    }
    const sameNameType = oldNorm.find(r => r.name === desired.name && r.type === desired.type);
    if (sameNameType) {
      actions.push({ action: 'UPDATE', risk: isMailRecord(desired) || isMailRecord(sameNameType) ? 'R3_REVIEW' : 'R2', old: sameNameType, next: desired, rollback: 'AVAILABLE' });
    } else {
      actions.push({ action: 'CREATE', risk: isMailRecord(desired) ? 'R2_MAIL_VERIFY' : 'R2', old: null, next: desired, rollback: 'AVAILABLE' });
    }
  }

  for (const old of oldNorm) {
    if (desiredByKey.has(recordKey(old))) continue;
    const replacement = desiredNorm.find(r => r.name === old.name && r.type === old.type);
    if (replacement) continue;
    actions.push({ action: isMailRecord(old) || isVerificationRecord(old) ? 'REVIEW' : 'REMOVE', risk: isMailRecord(old) || isVerificationRecord(old) ? 'R3_REVIEW' : 'R2_HIGH', old, next: null, rollback: 'AVAILABLE' });
  }

  return actions;
}

export function runDnsSafety({ domain, currentRecords = [], plannedActions = [], rollbackAvailable = false }) {
  const findings = [];
  const current = currentRecords.map(normalizeRecord);

  const mx = current.filter(r => r.type === 'MX');
  const spf = current.filter(r => r.type === 'TXT' && r.content.toLowerCase().startsWith('v=spf1'));
  const dkim = current.filter(r => r.name.includes('_domainkey'));
  const dmarc = current.filter(r => r.name.includes('_dmarc'));

  if (mx.length) findings.push({ code: 'MAIL_MX_PRESENT', status: 'PASS' });
  if (spf.length) findings.push({ code: 'MAIL_SPF_PRESENT', status: 'PASS' });
  if (dkim.length) findings.push({ code: 'MAIL_DKIM_PRESENT', status: 'PASS' });
  if (dmarc.length) findings.push({ code: 'MAIL_DMARC_PRESENT', status: 'PASS' });

  for (const action of plannedActions) {
    const target = action.old || action.next;
    if (!target) continue;
    if (isMailRecord(target) && ['REMOVE','UPDATE','REVIEW'].includes(action.action)) {
      findings.push({ code: 'MAIL_RISK_DETECTED', status: 'BLOCK', action });
    }
    if (target.name === domain && target.type === 'CNAME' && current.some(r => r.name === domain && r.type === 'A')) {
      findings.push({ code: 'ROOT_A_CNAME_CONFLICT', status: 'BLOCK', action });
    }
    if (isMailRecord(target) && target.proxied) {
      findings.push({ code: 'MAIL_PROXY_MUST_BE_OFF', status: 'BLOCK', action });
    }
  }

  if (!rollbackAvailable && plannedActions.some(a => ['UPDATE','REMOVE','REVIEW'].includes(a.action))) {
    findings.push({ code: 'ROLLBACK_POINT_MISSING', status: 'BLOCK' });
  }

  const blocked = findings.some(f => f.status === 'BLOCK');
  return {
    domain,
    decision: blocked ? 'BLOCK_CHANGE' : 'ALLOW_WITH_VERIFY',
    findings
  };
}

export function buildDnsPlan({ domain, currentRecords = [], desiredRecords = [], rollbackAvailable = true }) {
  const actions = diffDns(currentRecords, desiredRecords);
  const safety = runDnsSafety({ domain, currentRecords, plannedActions: actions, rollbackAvailable });
  return {
    plan_id: `DNS-PLAN-${Date.now()}`,
    domain,
    risk: safety.decision === 'BLOCK_CHANGE' ? 'BLOCKED' : 'R2',
    rollback: rollbackAvailable ? 'AVAILABLE' : 'MISSING',
    actions,
    safety,
    verify_required: true
  };
}
