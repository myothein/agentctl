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
