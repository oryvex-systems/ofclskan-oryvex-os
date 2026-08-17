import { buildDnsPlan, createDnsSnapshot } from './index.js';
import { compileExecutionBatch, executeDnsBatch, verifyDnsState, verifyDomainReady } from './execution.js';

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
  const setState = (state, detail = null) => {
    history.push({ state, detail, at: new Date().toISOString() });
    onState(state, detail);
  };

  setState('REQUESTED', { domain });

  try {
    setState('DISCOVERING');
    const currentRecords = await adapter.listDnsRecords(domain);
    const snapshot = createDnsSnapshot({ domain, registrar, nameservers, records: currentRecords });
    setState('SNAPSHOT_CREATED', { snapshot_id: snapshot.snapshot_id, record_count: snapshot.dns_records.length });

    const plan = buildDnsPlan({ domain, currentRecords: snapshot.dns_records, desiredRecords, rollbackAvailable });
    setState('PLAN_READY', { plan_id: plan.plan_id, decision: plan.safety.decision });

    if (plan.safety.decision !== 'ALLOW_WITH_VERIFY') {
      setState('BLOCKED', { findings: plan.safety.findings });
      return { success: false, status: 'BLOCKED', snapshot, plan, history };
    }

    const batch = compileExecutionBatch(plan);
    setState('EXECUTING', { command_count: batch.commands.length });
    const execution = await executeDnsBatch({ batch, connector: adapter });

    setState('VERIFYING');
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

    setState(readiness.status, { failures: readiness.failures });
    return {
      success: readiness.success,
      status: readiness.status,
      snapshot,
      plan,
      batch,
      execution,
      verification: { dns: dnsCheck, readiness },
      history
    };
  } catch (error) {
    setState('FAILED', { message: error.message });
    return { success: false, status: 'FAILED', error: error.message, history };
  }
}
