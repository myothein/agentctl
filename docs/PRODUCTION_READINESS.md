# Production readiness gates — agentctl

**Status: NO-GO.** This proposed branch addresses source-control hygiene only. It is **not** a production certification.

## Mandatory pre-merge checks

- [ ] Arrange independent, verified backup of all runtime tenant databases, logs and original configuration. Removing tracked files from a branch must not erase the only copy of operational evidence.
- [ ] Review and rotate/revoke any potentially committed live credentials, and provision secret-manager environment injection. A Git commit deletion does **not** remove secrets or data from past Git history, forks or caches. History cleanup requires separately approved coordination.
- [ ] Generate and commit a pinned dependency lockfile; run clean reproducible dependency install and production build.
- [ ] Add unit/integration tests, verify cross-service API and DB contracts, and collect pass/fail evidence.
- [ ] Prove least-privilege authorization, auditability, tenant isolation, zero hard-coded production credentials, and recovery after restart.
- [ ] Complete service-specific blockers:
- [ ] Windows NSSM installation, rollback and upgrade testing
- [ ] Fail-closed signed artifact/checksum verification
- [ ] Replace placeholder/no-op tests with real Windows runner E2E
- [ ] Installer privileges, ACLs and backup/restore acceptance
- [ ] Require independent review, security scan, signed artifacts where applicable, restore drill and approved release go/no-go.

Do not integrate with UIMS V1 until the six infrastructure repositories pass their release gates. No production deployment is authorized by this PR.

## CI verification scope

The initial CI jobs check tracked-file hygiene, dependency lockfile presence, clean npm installation and TypeScript compilation. A successful result **does not** prove authentication, database migrations, offline data safety, functional tests, device integration, signing, or production readiness. Keep the PR as draft until independent release criteria pass.

## CLI credential disclosure hardening — 2026-11-23

- Added a **default-deny** terminal display policy. `config get`, `config list`, and `config diff` redact all unapproved configuration keys (including passwords, database URLs, API keys, private keys and tokens). Only strictly validated nonsecret operational fields may be displayed.
- Removed raw CLI argument logging and suppressed raw exception messages/stacks from the process-level error logger. Failed commands now set a nonzero process exit code.
- Removed the hardcoded fake `1.0.1` latest release and fictional temporary update binary path. Legacy `checkUpdate` and `autoUpdate` fail closed until an authenticated, signed update source is implemented. Signed artifact verification-only and the existing staged rollback QA code remain intact.
- Added synthetic regression tests for credential redaction, malformed identifiers and blocked unsigned update discovery.
- Tests do NOT prove the safety of every legacy command. `config set KEY=VALUE` and `config add-new KEY=VALUE` still put nonsecret values in the OS process command line / shell history. Added pre-write validation that rejects malformed keys, control characters, and common credential-bearing keys (passwords, tokens, API keys, private keys, database URLs, etc.) with negative unit tests. Other unrecognized keys are not categorically safe: do not pass any secrets under benign names. Provision runtime secrets through a protected channel, not these CLI arguments.
- Configuration backup ACL/encryption, key rotation, actual Windows service installation/upgrade/rollback, UAC/least privilege, and independent signed release key approval remain open **PRODUCTION NO-GO** acceptance gates.

No production service, secret store, repository visibility, or UIMS application was modified by this work.


## 2026-11-23 — Cross-repository backup and Windows service contract (Draft)

- The `agentctl install --node-runtime` preflight now inspects the protected `agent.env` before any NSSM/SCM registration. It requires `NODE_ENV=production` plus an explicit, absolute, normalized, pre-existing `TENANT_AGENT_BACKUP_DIR` on a Windows local drive. The backup path must be outside the Node application installation tree and the SQLite runtime directory; a relative/ambiguous/path-traversal/UNC or control-character path is rejected.
- Windows ACL acceptance inspects the **existing backup directory** and path ancestors, rejects symlink/reparse redirects, broad untrusted grants, and missing service-specific SID write access. It uses the same service-runtime ACL policy and explicit OWNER RIGHTS anti-escalation protection already required for SQLite data. Error output never includes the actual backup directory or configuration contents.
- The disposable GitHub-hosted Windows SCM regression now provisions a dedicated, synthetic backup directory with restricted service-SID ACL and a synthetic `NODE_ENV=production` configuration and exercises this preflight before the actual demand-start service registration. It does not install anything on an owner's workstation or DOA server.
- Closed a latent, unregistered nested `agent config set` code path that previously echoed raw configuration values and wrote unvalidated assignments. It now uses the same default-deny nonsecret CLI parser as the active `config set` command, preserves protected fields, suppresses raw values/errors, and fails before privileged IO on unsafe assignments.
- **Outstanding:** the actual release must pin identical reviewed revisions of `agentctl` and `tenant-agent` and prove the exact combination in a single Windows SCM run; existing CI may still pin older source revisions. A valid local backup directory is NOT an off-host disaster-recovery copy or proof of BitLocker, secure key custody, immutable retention or recovery objectives. Real Keycloak, agent credential rotation and tenant isolation remain unaccepted. **Production NO-GO; no merge or deployment.**
