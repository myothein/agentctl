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

## NTFS ACL security preflight (2026-11-23)

The opt-in Node service installation now **requires a read-only Windows ACL security check BEFORE ANY NSSM/SCM command**. The check invokes the Windows-shipped `Microsoft.PowerShell.Security` ACL provider in one bounded batch and inspects these paths: the actual Node runtime executable, the agent entry and installed application directories, the NSSM executable, the secret environment file, its parent config directory, the private runtime working directory and its parent.

- For private configuration and runtime folders, untrusted Allow grants that permit access are rejected; SYSTEM must retain write permission. For executable and code paths, any untrusted write/modify/delete/permission-changing grant is rejected.
- All target path ancestors are inspected for Windows reparse points; redirected paths are rejected. Unmapped identities are conservatively treated as **untrusted**, not silently elevated.
- PowerShell errors, inaccessible ACLs, incomplete results and missing verification callbacks **fail closed**. The security check never changes permissions by itself and does not print secret values or ACL contents to installer logs.
- Unit tests prove broad access to config and write access to code are denied, missing ACL review is rejected before NSSM, and correct restricted ACLs are accepted.

**Hosted Windows verification:** The CI test deliberately grants `BUILTIN\\Users` read access to a synthetic `agent.env` file and confirms installation is refused with zero NSSM calls. The test then removes that grant, restricts synthetic data/app directories to SYSTEM and Administrators, stages hash-matched Node 22 and pinned NSSM binaries in protected Program Files paths, and runs the **genuine** tenant-agent under Windows SCM through offline event persistence, service restart and idempotent replay. Runtime checkpoint: https://github.com/myothein/agentctl/actions/runs/45100402324 (real Node Windows job **PASS**).

**Residual limitations:** This preflight is not a full recursive content-integrity audit of every npm module, a production package-signature validation, a demonstrated least-privilege Windows service identity, or proof of ACL security for future generated SQLite WAL/log/backup files. SHA-256 matching of a CI copy proves copied bytes match the source bytes, not the source publisher's trust. Production remains **NO-GO**.

## Disposable GitHub-hosted Windows QA evidence

- Node-install orchestrator unit tests: checked prerequisite rejection, Node 22/path verification, existing-service denial, argument hygiene and forced AppParameters rollback. Verified at https://github.com/myothein/agentctl/actions/runs/45097002722 .
- Real Node 22 agent SCM QA (initial): staged the compiled **genuine tenant-agent** application and its native dependencies in an isolated GitHub-hosted Windows runner. Created a unique `GTSPNodeAgentQA_<run_id>` SCM service through the actual `agentctl` installer logic and pinned NSSM. Verified manual-start, real `sc.exe` start/stop/restart, actual SQLite outbox initialization and persistence, then removed the synthetic service and staging files. **PASS:** https://github.com/myothein/agentctl/actions/runs/45097144794 .
- **Real Node + SCM offline integration (verified)**: the same genuine service receives a synthetic tenant event from a loopback test API, persists it in SQLite while Central is offline, survives a real SCM stop/start, delivers the event when Central recovers, and handles a replay after resetting the local acknowledgment while keeping a single Central event. Exact source checkpoint `9e6a705eb052d17ee07b53f7aaee65776b9bf916`: **5/5 GitHub Actions jobs PASS**, including native Windows real agent SCM, independent synthetic signed-update rollback, build, Windows unit and lockfile tests: https://github.com/myothein/agentctl/actions/runs/45097352354 . Repository hygiene PASS: https://github.com/myothein/agentctl/actions/runs/45097352332 .

**Scope limitation:** The SCM event tests use loopback synthetic Tenant/Central HTTP fixtures, not real Keycloak or a production Central deployment. `node --version` checking is not a substitute for authenticated vendor binary provenance or signed release metadata; file mode `0600` alone is not an NTFS ACL acceptance test.

**This is an actual Node process hosted by NSSM/SCM — not the earlier synthetic worker.** The original signed rollback QA on a synthetic worker remains separate.

## Still required before production approval

- Confirm signed and reproducible distribution of Node 22, JS sources, npm production dependencies, native SQLite modules and NSSM; pin hashes/signatures and review their provenance and version compatibility.
- Complete a **production-equivalent** least-privilege Windows service identity/NTFS ACL acceptance, including recursive application package integrity and generated SQLite WAL, logs and off-host backups. The new installer ACL checks cover key staged roots but do not certify all generated artifacts. Never keep real credentials in GitHub, commit history, CLI arguments or publicly accessible files.
- Staging-based Keycloak/OIDC, Central and Tenant Service integration; service health and eventual retry; safe Windows recovery; independently restored off-host backups; operational observability, multi-university isolation and rollback.
- Verify cross-repository GitHub Actions **private repository** read permissions before changing visibility: the current source checkouts rely on public repository availability.
- Explicit operator-reviewed production installation plan and approval. Do **not** run this installer on the DOA/University production server under the sandbox QA authorization.

**Release gate remains NO-GO; no production or UIMS V1 resources were modified.**
