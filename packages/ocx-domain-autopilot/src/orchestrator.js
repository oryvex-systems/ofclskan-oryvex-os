import { buildDnsPlan, createDnsSnapshot } from './index.js';
import { compileExecutionBatch, executeDnsBatch, verifyDnsState, verifyDomainReady } from './execution.js';
import { createAuditLedger } from './audit.js';
import { buildRecoveryPlan } from './recovery.js';

export const DOMAIN_STATES = Object.freeze([
  'REQUESTED',
  'DISCOVERING',
  'SNAPSHOT_CREATED',
  'PLAN_READY',
  'BLOCKED',
  'EXECUTING',
  'VERIFYING',
  'DOMAIN_READY',
  'DOMAIN_NOT_READY',
  'RECOVERY_PLAN_READY',
  'FAILED'
]);

function ensureAdapter(adapter) {
  const required = ['listDnsRecords', 'createDnsRecord', 'updateDnsRecord', 'verifySsl', 'verifyHttp', 'verifyWorker', 'verifyMail'];
  const missing = required.filter(name => typeof adapter?.[name] !== 'function');
  if (missing.length) throw new Error(`Domain adapter contract incomplete: ${missing.join(', ')}`);
}

export async function runDomainAutopilot({
  domain,
  desiredRecords = [],
  registrar = null,
  nameservers = [],
  rollbackAvailable = true,
  adapter,
  onState = () => {}
}) {
  if (!domain) throw new Error('domain is required');
  ensureAdapter(adapter);
  const history = [];
  const audit = createAuditLedger({ domain });
  let snapshot = null;
  let plan = null;

  const setState = (state, detail = null, auditMeta = {}) => {
    history.push({ state, detail, at: new Date().toISOString() });
    audit.append({
      phase: state,
      action: auditMeta.action || state,
      risk: auditMeta.risk || 'R0',
      target: auditMeta.target || domain,
      result: detail,
      status: state === 'BLOCKED' ? 'BLOCKED' : state === 'FAILED' ? 'FAILED' : 'INFO'
    });
    onState(state, detail);
  };

  setState('REQUESTED', { domain }, { action: 'DOMAIN.REQUEST' });

  try {
    setState('DISCOVERING', null, { action: 'CLO.DNS.LIST' });
    const currentRecords = await adapter.listDnsRecords(domain);
    snapshot = createDnsSnapshot({ domain, registrar, nameservers, records: currentRecords });
    setState('SNAPSHOT_CREATED', { snapshot_id: snapshot.snapshot_id, record_count: snapshot.dns_records.length }, { action: 'DNS.SNAPSHOT.CREATE' });

    plan = buildDnsPlan({ domain, currentRecords: snapshot.dns_records, desiredRecords, rollbackAvailable });
    setState('PLAN_READY', { plan_id: plan.plan_id, decision: plan.safety.decision }, { action: 'DNS.PLAN.BUILD', risk: plan.risk === 'BLOCKED' ? 'R3' : 'R2' });

    if (plan.safety.decision !== 'ALLOW_WITH_VERIFY') {
      setState('BLOCKED', { findings: plan.safety.findings }, { action: 'DNS.PLAN.BLOCK', risk: 'R3' });
      return { success: false, status: 'BLOCKED', snapshot, plan, audit: audit.list(), audit_summary: audit.summary(), history };
    }

    const batch = compileExecutionBatch(plan);
    setState('EXECUTING', { command_count: batch.commands.length }, { action: 'DNS.BATCH.EXECUTE', risk: 'R2' });
    const execution = await executeDnsBatch({ batch, connector: adapter });

    setState('VERIFYING', null, { action: 'DOMAIN.VERIFY', risk: 'R0' });
    const observedRecords = await adapter.listDnsRecords(domain);
    const dnsCheck = verifyDnsState({ desiredRecords, observedRecords });
    const [ssl, http, worker, mail] = await Promise.all([
      adapter.verifySsl(domain),
      adapter.verifyHttp(domain),
      adapter.verifyWorker(domain),
      adapter.verifyMail(domain)
    ]);

    const readiness = verifyDomainReady({
      dns: dnsCheck.success,
      ssl: Boolean(ssl),
      http: Boolean(http),
      worker: Boolean(worker),
      mail: Boolean(mail)
    });

    setState(readiness.status, { failures: readiness.failures }, { action: 'DOMAIN.READINESS.CHECK' });

    const recovery = readiness.success ? buildRecoveryPlan({ domain, snapshot, plan, readiness }) : buildRecoveryPlan({ domain, snapshot, plan, readiness });
    if (!readiness.success && recovery.status === 'RECOVERY_PLAN_READY') {
      setState('RECOVERY_PLAN_READY', { recovery_id: recovery.recovery_id, actions: recovery.actions }, { action: 'RECOVERY.PLAN.BUILD', risk: 'R2' });
    }

    return {
      success: readiness.success,
      status: readiness.status,
      snapshot,
      plan,
      batch,
      execution,
      verification: { dns: dnsCheck, readiness },
      recovery,
      audit: audit.list(),
      audit_summary: audit.summary(),
      history
    };
  } catch (error) {
    setState('FAILED', { message: error.message }, { action: 'DOMAIN.AUTOPILOT.FAIL', risk: 'R2' });
    const recovery = buildRecoveryPlan({ domain, snapshot, plan, error: error.message });
    if (recovery.status === 'RECOVERY_PLAN_READY') {
      setState('RECOVERY_PLAN_READY', { recovery_id: recovery.recovery_id, actions: recovery.actions }, { action: 'RECOVERY.PLAN.BUILD', risk: 'R2' });
    }
    return {
      success: false,
      status: 'FAILED',
      error: error.message,
      recovery,
      audit: audit.list(),
      audit_summary: audit.summary(),
      history
    };
  }
}
