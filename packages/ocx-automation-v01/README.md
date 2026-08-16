# OCX Automation v0.1

OCX Automation v0.1 is the first operational runtime for ORYVEX CORE automation.

## Goal

Turn repeated operations into a controlled loop:

PLAN -> POLICY -> EXECUTE -> VERIFY -> AUDIT -> REPORT

Primary v0.1 focus:
- deploy planning and verification
- health and smoke tests
- retry and failure reporting
- safe L1/L2/L3 policy gates
- pilot validation against SÖZÜNDE USTA and OCX-DOPLT

## Safety levels

- L1: read/test/health/plan/verify. Autonomous.
- L2: deploy, DNS write, release, rollback. Explicit L2 enable required.
- L3: nameserver, domain transfer and unknown operations. Human approval required.

Unknown actions default to L3.

## Commands

```bash
npm test
npm run check
node src/pilot.mjs
```

Pilot defaults:
- DOPLT: https://ocx-doplt.oryvex-core.workers.dev
- App: https://sozundeusta.com.tr

Environment overrides:
- OCX_DOPLT_URL
- OCX_PILOT_URL

## v0.1 acceptance gate

A pilot pass requires:
1. DOPLT /health returns READY.
2. DOPLT /plan returns PLAN for sozundeusta.com.tr -> sozunde-usta.
3. Pilot application returns a successful HTTP response.
4. Local policy/retry tests pass.

No production mutation is performed by the pilot runner.
