# GTSP V1 — Node 22 Windows Service Installation Contract

**Date:** 2026-11-23 (Myanmar local)  
**Release:** **PRODUCTION NO-GO** — this is an audited sandbox implementation, not an approved installation on a user-managed server.

## Existing application, no fabricated executable

`tenant-agent` currently builds to `dist/index.js`, rather than a native `tenant-agent.exe`. Instead of silently claiming that a nonexistent binary exists, `agentctl install` keeps its original EXE mode and offers a separately requested `--node-runtime` mode.

The opt-in Node service mode requires the following pre-existing, operator-provisioned paths:

| Purpose | Expected Windows path |
| --- | --- |
| Node 22 executable | `C:\Program Files\nodejs\node.exe` |
| Reviewed application entry | `C:\Program Files\TenantAgent\app\dist\index.js` |
| Application package and native SQLite modules | `C:\Program Files\TenantAgent\app\package.json` and `app\node_modules` |
| Runtime data and SQLite outbox root | `C:\ProgramData\TenantAgent\runtime` |
| Protected config file | `C:\ProgramData\TenantAgent\config\agent.env` |
| Independently provisioned NSSM binary | `C:\Program Files\TenantAgent\bin\nssm.exe` |

The reviewed `agentctl install --node-runtime` operation validates Node's reported major version, validates that the absolute script/config/working-directory paths have no disallowed argument quoting or traversal, checks all prerequisite files before any SCM call, refuses to replace an existing service, and registers a manual-start NSSM service only when all preflights pass.

**Secrets never appear as command-line arguments.** The NSSM `AppParameters` setting contains only the absolute configuration-file path in Node 22's `--env-file` option and the JavaScript entry path. NSSM `AppDirectory` points to the protected runtime folder so the agent's durable SQLite `data/outbox.db` is not written under Program Files.

If NSSM AppDirectory/AppParameters/manual-start configuration fails after registration, the newly created service must be rolled back. Failure to remove it is reported as **manual recovery required**.

## Disposable GitHub-hosted Windows QA evidence

- Node-install orchestrator unit tests: checked prerequisite rejection, Node 22/path verification, existing-service denial, argument hygiene and forced AppParameters rollback. Verified at https://github.com/myothein/agentctl/actions/runs/45097002722 .
- Real Node 22 agent SCM QA (initial): staged the compiled **genuine tenant-agent** application and its native dependencies in an isolated GitHub-hosted Windows runner. Created a unique `GTSPNodeAgentQA_<run_id>` SCM service through the actual `agentctl` installer logic and pinned NSSM. Verified manual-start, real `sc.exe` start/stop/restart, actual SQLite outbox initialization and persistence, then removed the synthetic service and staging files. **PASS:** https://github.com/myothein/agentctl/actions/runs/45097144794 .
- A separate CI revision exercises source-event offline persistence and replay through the same genuine SCM service. Treat its result as **unverified** until the exact workflow job succeeds.

**This is an actual Node process hosted by NSSM/SCM — not the earlier synthetic worker.** The original signed rollback QA on a synthetic worker remains separate.

## Still required before production approval

- Confirm signed and reproducible distribution of Node 22, JS sources, npm production dependencies, native SQLite modules and NSSM; pin hashes/signatures and review their provenance and version compatibility.
- Verify runtime service identity and NTFS ACLs restrict `agent.env`, SQLite WAL files, logs, backups, and the application tree. Never keep real credentials in GitHub, commit history, CLI arguments or publicly accessible files.
- Staging-based Keycloak/OIDC, Central and Tenant Service integration; service health and eventual retry; safe Windows recovery; independently restored off-host backups; operational observability, multi-university isolation and rollback.
- Verify cross-repository GitHub Actions **private repository** read permissions before changing visibility: the current source checkouts rely on public repository availability.
- Explicit operator-reviewed production installation plan and approval. Do **not** run this installer on the DOA/University production server under the sandbox QA authorization.

**Release gate remains NO-GO; no production or UIMS V1 resources were modified.**
