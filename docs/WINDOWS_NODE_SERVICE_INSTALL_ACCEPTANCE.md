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

**Post-start SQLite artifact verification (latest):** The audited `verifyNodeSqliteArtifacts` function checks the generated `runtime\\data` directory, the real `outbox.db`, and any WAL/SHM sidecars **that exist when checked** with the same read-only NTFS ACL and reparse-point rules. The genuine Windows SCM CI exercises this both during offline persistence and after restart. When the service is stopped, the test deliberately grants `BUILTIN\\Users` READ on `outbox.db` and proves the verifier **rejects** it. The test removes that grant and verifies private ACLs are restored **before** service restart/replay. **PASS, five CI jobs**: https://github.com/myothein/agentctl/actions/runs/45101289021 (runtime code checkpoint `f63b3644bbec28e4f960a20c0f91481afd84672a`). This is a permission-isolation check, **not** a backup/restore drill.

**Residual limitations:** Runtime sidecars may be absent at verification time, can be created later, and therefore require repeated checks/monitoring in production. The current preflight is not a full recursive npm module content-integrity audit, a publisher-signature validation, a demonstrated least-privilege Windows service identity, or a complete ACL acceptance of logs and backups. SHA-256 parity between a CI copy and source proves equal bytes, not trusted origin. Production remains **NO-GO**.

## Explicit low-privilege service identity — 2026-11-23

`agentctl install --node-runtime` now requires an explicitly declared `NT AUTHORITY\\LocalService` identity and configures it with NSSM `ObjectName` **before** allowing the new service to start. NSSM's implicit `LocalSystem` default, missing/unknown accounts, and a failed `ObjectName` operation are rejected, with rollback of only the new registration. The original EXE-mode interface remains separate.

The read-only Windows ACL security checks recognize the well-known `LocalService` SID `S-1-5-19` and require separately reviewed capabilities:

| Artifact | LocalService permission | Security requirement |
| --- | --- | --- |
| Protected `agent.env` and its config directory | Read only | No write, ownership change or permission-edit rights |
| `ProgramData\\TenantAgent\\runtime` and its data directory | Read/write/modify without ownership/ACL-change | Deny broader grants and all unrelated users |
| Node executable, NSSM and application entry | Read/execute | No ability to modify code or replace executables |
| Generated SQLite `outbox.db` and existing `-wal`/`-shm` | Explicit restricted runtime permissions | Recheck after restart and sidecar creation |

**Verified actual Windows identity**: The CI copies exact SHA-256-matching Node 22 and NSSM binaries to restricted disposable Program Files paths, grants `LocalService` only its needed accesses, configures NSSM with an empty-password built-in account, then checks `sc.exe qc` reports `SERVICE_START_NAME: NT AUTHORITY\\LocalService`. The genuine tenant-agent then successfully queues offline events, restarts through real SCM, delivers on Central recovery and avoids duplicate replay. Missing or privileged account tests fail **before** SCM calls; an NSSM `ObjectName` failure rolls back the newly created service. **All five CI jobs PASS** at runtime checkpoint `f9cb68e583e57af02bf429105b038fdef0c9725f`: https://github.com/myothein/agentctl/actions/runs/45102622145 .

**Remaining isolation caveat:** `LocalService` is a Windows-wide built-in account; different services running under it can share its permitted data access. It is not a dedicated per-tenant virtual service identity. Before multi-university production acceptance, test per-service SID or reviewed dedicated service identities and separate per-tenant file/database permissions, real HTTP/OIDC/Keycloak behavior, authenticated binary origin and runtime backup/restore. This CI uses synthetic test endpoints and disposable data only.

## Per-service SID scoped ACLs (2026-11-23)

Windows service authentication has **two distinct controls**: the process account remains `NT AUTHORITY\\LocalService`; the service-specific `S-1-5-80-...` SID is added to its access token only when the SCM SID type is enabled. This release uses `UNRESTRICTED` service SID type **to add** the service SID, not to grant full administrative rights. See the Windows [Service SID documentation](https://learn.microsoft.com/en-us/windows/desktop/api/winsvc/ns-winsvc-service_sid_info) and [Microsoft's explanation of service SID vs account ownership](https://devblogs.microsoft.com/oldnewthing/20231004-00/?p=108849/).

**Audited installer change:** For the Node mode, the exact service-specific SID is resolved using `sc.exe showsid` against the validated service name. `installNewService` refuses missing/malformed SIDs and requires a SID-configuration callback. After registering a *new* service and configuring the LocalService account, it runs `sc.exe sidtype <service> unrestricted` and verifies `sc.exe qsidtype` **before** manual-start registration. If SID setup fails, the new service is removed; existing services are never replaced.

**NTFS permissions:** `agent.env`/config paths allow SYSTEM + Administrators + only this service SID (read), not the generic LocalService SID. Runtime/SQLite paths allow this service SID limited modify access. Executables and application source paths remain read/execute for LocalService, with no untrusted write grants. New generated SQLite database and existing WAL/SHM sidecars are rechecked against the exact same service SID. Preflight checks run before the first NSSM service-status or installation request. Since some Windows APIs cannot resolve an unregistered service SID name, the disposable QA pre-provisions raw SecurityIdentifier ACL entries rather than temporarily registering an unsafe service.

**Hosted Windows proof:** The actual Node.js tenant-agent runs under LocalService with the service-specific SID enabled, verified via `sc.exe qc` and `sc.exe qsidtype`, and successfully performs SQLite offline storage, Windows SCM restart, central HTTP recovery delivery and idempotent replay. The separate unit tests deny invalid/missing SIDs, missing SID configuration, generic LocalService access to private files, and verify SID setup rollback. **Runtime checkpoint `cdcdad502728cda35a7f8faa6f72634058e29104`: 5/5 CI PASS:** https://github.com/myothein/agentctl/actions/runs/45103940261 .

**Security limitation — release NO-GO:** An `UNRESTRICTED` service SID **does not replace the LocalService process account or change file ownership**. Another service using the same LocalService account may still exploit ownership rights if generated files are LocalService-owned or inherit a broad ACL. The CI validates the checked ACL grants and lifecycle, **not** a hostile sibling service attempting to change ownership/DACLs. Production acceptance requires a controlled second-service cross-access denial test, explicit file owner/created-WAL review, unique service name + SID per tenant, recursive module integrity, signed supply chain and off-host recovery. Do not claim independent tenant isolation based only on the service SID.

## Owner-based DACL isolation — adversarial sibling-service acceptance (2026-11-23)

Microsoft documents that **OWNER RIGHTS**, the well-known `S-1-3-4` SID, can suppress the current file owner's otherwise implicit `WRITE_DAC` access: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers . Without a protective rule, another Windows service using the **same LocalService user identity** may change the DACL of a LocalService-owned file, regardless of the intended per-service `S-1-5-80-...` allow rule: https://devblogs.microsoft.com/oldnewthing/20231004-00/?p=108849/ .

**Implemented release guard:** Read-only `assertAclSnapshot` requires an `OWNER RIGHTS` Allow ACE granting only `READ_CONTROL` (`ReadPermissions`), without `WRITE_DAC`, `WRITE_OWNER`, data access, generic or full-control rights, on protected config/runtime directories and existing SQLite `outbox.db` and WAL/SHM sidecars. Missing or excessive OWNER RIGHTS ACEs are rejected. The disposable Windows CI provisions inheritable OWNER RIGHTS rules on private directory trees so newly created SQLite database and journal files receive the guard. The installer remains fail-closed before NSSM/SCM registration when required protection is absent; it does not grant privileges itself.

**Adversarial real SCM acceptance:** Under a hosted Windows runner, the actual first Node 22 tenant-agent runs under `LocalService` with its own `GTSPNodeAgentQA_<run-id>` service SID. After writing an unacknowledged SQLite event, the service is stopped. A *second* NSSM/SCM service (`GTSPSiblingQA_<run-id>`) is launched under the **same LocalService account** with a different service SID. It attempts to open the first service's real synthetic `outbox.db` for reading and to grant `BUILTIN\\Users` read access by changing its DACL. **Both operations must be denied**; success in either is a failing release test. The second service and all disposable staging paths are removed, followed by the original service's restart, Central recovery delivery and idempotent replay. A separate read-only owner audit verifies that the SQLite database's actual owner is **`S-1-5-19` LocalService**, so this test reproduces the previously identified shared-owner threat rather than testing only a different-owner ACL.

- **Sibling attack and SCM restart checkpoint `94085f96288d99dca638f9d5175e63edf6b74ef5`: 5/5 jobs PASS**, with explicit log lines confirming both database read and ACL modification denied: https://github.com/myothein/agentctl/actions/runs/45106667526 .
- **Observed SQLite owner checkpoint `68b537269e328973bf52c665f0abdcd886dc4094`: 5/5 jobs PASS**, log confirms shared LocalService owner while sibling operations remained denied: https://github.com/myothein/agentctl/actions/runs/45106936324 .
- A subsequent CI revision checks the second service's actual SCM `SERVICE_START_NAME` and `SERVICE_SID_TYPE` explicitly; accept that strengthened revision only after its own CI passes.

**Scope limit:** This is a controlled, disposable **two-service** negative test, not a proof against every local privilege escalation, tampering with other OS resources, malicious code executing as Administrators/SYSTEM, symlinks created after preflight, or cross-tenant attacks across an entire deployment. Owner-rights ACL inheritance and generated WAL/SHM/log/backup ACLs require repeatable monitoring and operational recovery procedures. The shared LocalService user is still not equivalent to a separate local service account per university.

## Disposable GitHub-hosted Windows QA evidence

- Node-install orchestrator unit tests: checked prerequisite rejection, Node 22/path verification, existing-service denial, argument hygiene and forced AppParameters rollback. Verified at https://github.com/myothein/agentctl/actions/runs/45097002722 .
- Real Node 22 agent SCM QA (initial): staged the compiled **genuine tenant-agent** application and its native dependencies in an isolated GitHub-hosted Windows runner. Created a unique `GTSPNodeAgentQA_<run_id>` SCM service through the actual `agentctl` installer logic and pinned NSSM. Verified manual-start, real `sc.exe` start/stop/restart, actual SQLite outbox initialization and persistence, then removed the synthetic service and staging files. **PASS:** https://github.com/myothein/agentctl/actions/runs/45097144794 .
- **Real Node + SCM offline integration (verified)**: the same genuine service receives a synthetic tenant event from a loopback test API, persists it in SQLite while Central is offline, survives a real SCM stop/start, delivers the event when Central recovers, and handles a replay after resetting the local acknowledgment while keeping a single Central event. Exact source checkpoint `9e6a705eb052d17ee07b53f7aaee65776b9bf916`: **5/5 GitHub Actions jobs PASS**, including native Windows real agent SCM, independent synthetic signed-update rollback, build, Windows unit and lockfile tests: https://github.com/myothein/agentctl/actions/runs/45097352354 . Repository hygiene PASS: https://github.com/myothein/agentctl/actions/runs/45097352332 .

**Scope limitation:** The SCM event tests use loopback synthetic Tenant/Central HTTP fixtures, not real Keycloak or a production Central deployment. `node --version` checking is not a substitute for authenticated vendor binary provenance or signed release metadata; file mode `0600` alone is not an NTFS ACL acceptance test.

**This is an actual Node process hosted by NSSM/SCM — not the earlier synthetic worker.** The original signed rollback QA on a synthetic worker remains separate.

## Still required before production approval

- Confirm signed and reproducible distribution of Node 22, JS sources, npm production dependencies, native SQLite modules and NSSM; pin hashes/signatures and review their provenance and version compatibility.
- Complete **production-equivalent per-tenant service isolation and continuous NTFS owner/ACL acceptance**. A real shared-LocalService owner and two-service sibling read/WRITE_DAC negative test now pass in disposable Windows QA using inheritable OWNER RIGHTS rules. Still open: a broader tenant-by-tenant service attack matrix, per-user process privileges and owner drift after updates/reboots, recursive application integrity, long-lived WAL/SHM and log ACL drift, backup custody and off-host restore. The post-start verifier covers existing synthetic SQLite artifacts, not all future files. Never keep real credentials in GitHub, commit history, CLI arguments or publicly accessible files.
- Staging-based Keycloak/OIDC, Central and Tenant Service integration; service health and eventual retry; safe Windows recovery; independently restored off-host backups; operational observability, multi-university isolation and rollback.
- Verify cross-repository GitHub Actions **private repository** read permissions before changing visibility: the current source checkouts rely on public repository availability.
- Explicit operator-reviewed production installation plan and approval. Do **not** run this installer on the DOA/University production server under the sandbox QA authorization.

**Release gate remains NO-GO; no production or UIMS V1 resources were modified.**
