# AgentCTL — Isolated Windows Production-Acceptance Runbook

**Release: PRODUCTION NO-GO.** This runbook is for an operator-approved, disposable Windows VM / QA PC only. Never run the destructive parts against DOA-Web-Server, active tenants, or a host with important SQLite outbox data.

## Evidence to collect (do not attach secrets)

- QA host OS build, Node runtime, NSSM binary provenance/version, disk layout, service name and user privilege (redact machine identity as needed).
- Reproducible git commit IDs, signed manifest, independently approved Ed25519 public-key fingerprint, SHA-256 of test artifact, and exact tested source revision.
- Isolated PostgreSQL and SQLite test data fixture manifest. Backup SHA-256, successful independent restore and event count/UUID parity before any lifecycle changes.
- Timestamped service start/stop/status outcomes, heartbeat records, access-denied cases, event replay and durable acknowledgments. Redact tokens, connection strings and user data.

## Mandatory QA acceptance gates

| Gate | Pass criteria | Current evidence |
|---|---|---|
| G1 Repository hygiene and build | CI tests and locked install succeed | GitHub Actions verified |
| G2 Trust-root provisioning | Signed update passes against approved Ed25519 public key and rejects other keys | CI synthetic key only |
| G3 Install preflight | Refuses existing service, missing binary/config, unknown SCM state | CI mock NSSM PASS |
| G4 Real Windows service installation | Unique disposable service, appropriate ACLs, no overwrite of old service, demand start until approval | **Partial PASS:** source installer + synthetic Windows QA service; real tenant-agent.exe and target ACLs pending |
| G5 Update delivery | Safe staged write, file lock handling, separate data preservation, verified backup before service stop | Orchestrator simulation only |
| G6 Rollback | Startup failure, unhealthy update and interrupted replacement restore original hash and healthy service | **Partial PASS:** real hosted Windows synthetic service signed-update rollback; target agent/real power-loss pending |
| G7 Power outage / reboot | Event UUID parity and SQLite consistency after unexpected termination | NOT EXECUTED |
| G8 Offline network & duplicate replay | No event loss on 401/5xx/timeouts; correct idempotent central persisted events | GitHub three-service E2E partially covers |
| G9 Backup & restore | Independent restore to new QA location, SHA-256 and SQL counts verified | Partial SQLite CI backup only |
| G10 Security | Authorized admin, OIDC/RBAC as needed, audit, TLS, signer key rotation, historical exposed credential revocation | NOT CLOSED |
| G11 Operator sign-off | Verified release evidence with explicit deployment authorization | NOT APPROVED |

## Read-only Windows preflight (safe)

Use an *isolated* QA Windows host; these commands DO NOT install/update/stop a service:

```powershell
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber
Get-Service -Name 'tenant-agent' -ErrorAction SilentlyContinue
Test-Path 'C:\Program Files\TenantAgent\bin\nssm.exe'
Test-Path 'C:\ProgramData\TenantAgent\config\agent.env'
```

Never share the contents of `agent.env`, private keys, API keys or database connection URLs. Real service lifecycle tests require a clearly named throwaway test service, a verified independent backup and explicit operator approval.

## What is safe to demonstrate now

- On an isolated machine with a public trust root approved independently by the operator:
  `agentctl update --verify-only <local-binary-path> --manifest <manifest-json-path> --trusted-key <approved-public-key-pem>`
- The command must succeed only for the exactly signed, SHA-matching update and leave the service untouched.
- Live `agentctl update` remains **disabled**. The testable `runStagedSignedUpdate` orchestrator is NOT wired into Windows SCM. This separation prevents treating CI simulations as validated installations.

## Hard release blockers

- Implement and inspect a real Windows SCM/NSSM adapter with service-state timeouts, staging in same-volume temp, atomic rename where supported, locked-file recovery, independently durable backup, health probes, and recovery journal.
- Verified signer key custody/rotation (private signing key unavailable to CI), signed release artifact publishing/expiry/replay policy, code-signing requirements, protected trust-root storage.
- Real Windows 2019+/current Windows runners/QA hardware install-update-rollback and interruption/failover acceptance. Include power loss and database restore exercises.
- Security review: tenant data segregation, deterministic audit, secret rotation, and previously committed sensitive Git history.
- Owner approval before merge of draft PR or any live service modification.

**Existing UIMS V1 remains unchanged; production deployment remains prohibited.**


## Verified GitHub-hosted real Windows NSSM/SCM test — 2026-11-22

**Evidence:** https://github.com/myothein/agentctl/actions/runs/45038375014

- **Result:** All jobs PASS, including `real-windows-nssm-scm`. The earlier isolated real-service run also passed: https://github.com/myothein/agentctl/actions/runs/45038142117
- **Actual source exercised:** `installNewService()` with a real NSSM executable on a disposable GitHub-hosted Windows runner, unique service `GTSPAgentCtlQA_<run-id>`.
- **Windows SCM operations observed via automated assertions:** service registration, demand start, stop, restart, signed upgrade of a synthetic Node service artifact, health probes, verification of exact previous binary restoration after broken signed update, and rejection of a foreign signing key.
- **Safety guard:** the test requires a GitHub-hosted Windows runner, approved Draft PR branch, numeric run ID, unique nonexistent service, and the cleanup path removes its own service and directory. No user's workstation, DOA server or live tenant data touched.
- **Signer:** Ed25519 key generated transiently inside CI, **not** an approved production signer. Sample service is a disposable Node worker, **not** packaged `tenant-agent.exe`. Actual operator CLI preflight (`ensureAdmin` and installed paths), production service account, installer artifact provenance and ProgramData ACLs remain to be validated.
- **Open blockers:** real packaged tenant-agent.exe startup and shutdown, runtime configuration injection, protected signer/trust root custody and key rotation, interrupted power-loss recovery, sensitive Git history cleanup / credentials rotation, long-duration offline outage/backup restore, real Windows target-machine acceptance and explicit go-live approval. Therefore **PRODUCTION NO-GO**.
