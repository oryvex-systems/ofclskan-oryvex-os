# OCX Domain Autopilot — Pilot Standard v0.1

Pilot domain: `sozundeusta.com.tr`

## Purpose

OCX Domain Autopilot manages domain/DNS/deploy communication through provider connectors instead of manual dashboard operation.

Core loop:

`DISCOVER -> SNAPSHOT -> PLAN -> POLICY_CHECK -> EXECUTE -> VERIFY -> AUDIT -> REPORT`

Failure loop:

`DETECT -> DIAGNOSE -> SAFE_RETRY -> ALTERNATIVE -> VERIFY -> ROLLBACK/ESCALATE`

## Policy

### L1 — Autonomous
- Read zone/domain status
- Read DNS records
- Read Worker status
- Health/SSL/HTTP checks
- Compare desired vs current state
- Create reports and audit events

### L2 — Controlled
- Create/update non-destructive DNS records
- Attach an existing Worker to a configured hostname
- Deploy/update Worker code when a rollback point exists
- Restore DNS to the last verified snapshot

Every L2 action MUST be verified after execution.

### L3 — Human approval required
- Registrar transfer
- Nameserver change
- Domain deletion
- DNSSEC disable/enable during registrar transfer
- Billing/purchase/renewal
- Unlocking a registrar transfer lock
- Entering or submitting an EPP/Auth code to initiate a registrar transfer
- Any irreversible or ownership-changing action

This preserves the OCX CORE rule that registrar transfer and nameserver changes require explicit approval.

## Connectors

### CLO connector
Uses Cloudflare API with least-privilege token. Secret values never live in source control.

Environment references:
- `CLO_ACCOUNT_ID`
- `CLO_API_TOKEN`
- optional `CLO_ZONE_ID`

Required capabilities for the pilot:
- list/get zone
- list/create/update DNS records
- list/get Workers
- attach Worker custom domain
- verify domain attachment

### Registrar connector
Provider-neutral interface:
- `REGISTRAR.DOMAIN.GET`
- `REGISTRAR.DOMAIN.UNLOCK`
- `REGISTRAR.AUTHCODE.REQUEST`
- `REGISTRAR.TRANSFER.START`
- `REGISTRAR.TRANSFER.STATUS`
- `REGISTRAR.NAMESERVERS.GET`
- `REGISTRAR.NAMESERVERS.UPDATE`

Provider order:
1. Official API
2. Official MCP/app connector
3. Authenticated deterministic browser/RPA adapter
4. Human handoff only for steps that the provider technically prevents automating

Never scrape passwords, bypass MFA, or weaken registrar security.

## Pilot desired state

- Project: `SOZUNDE_USTA`
- Domain: `sozundeusta.com.tr`
- DNS provider: CLO
- Worker service: `sozunde-usta`
- Root hostname: `sozundeusta.com.tr`
- Optional alias: `www.sozundeusta.com.tr`
- Canonical URL: `https://sozundeusta.com.tr/`

## Test acceptance

Pilot is PASS only when all applicable checks are verified:
1. zone is active
2. authoritative nameservers match expected CLO nameservers
3. desired DNS state contains no unexplained conflicts
4. Worker exists
5. root custom domain is attached to the Worker
6. TLS certificate is active
7. HTTPS request succeeds
8. canonical URL resolves to the expected project
9. audit record is written
10. no secret value is logged

## Transfer reality gate

Registrar transfer is not treated as fully autonomous unless both losing and gaining registrars expose automatable, authorized mechanisms for unlock/auth-code/approval. If a provider requires an interactive approval that cannot be completed by an official API/app/RPA connector, OCX pauses at `WAITING_AUTHORIZATION` rather than pretending the transfer is complete.
