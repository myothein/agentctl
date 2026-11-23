# AgentCTL

**AgentCTL** is a Windows-focused command-line tool for managing the **Tenant Agent**. It includes:

* Agent lifecycle commands (`start`, `stop`, `restart`, `status`)
* Config and outbox management
* Self-update components under security review; untrusted automatic update metadata is disabled

**Release status: PRODUCTION NO-GO.** GitHub-hosted Windows QA verifies a disposable NSSM service lifecycle, signed-update checks, and simulated rollback. This is **not** an approved production updater, a signed installer, or evidence that the real tenant-agent binary is deployable.

### Windows Node 22 service mode — isolated SCM QA passed (2026-11-23)

There are two deliberately separate installation paths:

- Existing default `agentctl install`: requires a separately packaged `tenant-agent.exe`, which is **not supplied** by the current tenant-agent Node build.
- **Opt-in** `agentctl install --node-runtime`: runs the audited Node 22 application from `C:\\Program Files\\TenantAgent\\app\\dist\\index.js` using `C:\\Program Files\\nodejs\\node.exe`. Configuration stays in the protected file `C:\\ProgramData\\TenantAgent\\config\\agent.env`; SQLite runtime data stays under `C:\\ProgramData\\TenantAgent\\runtime`. The installer verifies the Node 22 version and prerequisites before SCM registration, refuses existing services, and rolls back newly created registrations on setup failure.

**Verified disposable Windows SCM test:** the genuine compiled tenant-agent and native SQLite modules ran as a manually started NSSM service. Tests covered start/stop/restart, offline queue persistence, Central recovery delivery and duplicate replay without duplicating the accepted event. All five CI jobs PASS: https://github.com/myothein/agentctl/actions/runs/45097352354 .

**Production remains NO-GO:** the Node-mode installer now explicitly uses the lower-privilege Windows `NT AUTHORITY\\LocalService` account, with hosted Windows SCM verification. The installer now also enables an explicit **per-service SID** and requires per-service SID ACL grants for config and SQLite rather than broad LocalService access; this was verified in disposable Windows SCM QA. **The service SID does not change LocalService file ownership**, so the installer now requires inheritable OWNER RIGHTS (`S-1-3-4`) ACL protection; an actual second LocalService Windows service was denied both SQLite read access and owner-based DACL changes on a shared-LocalService-owned test database. This limited two-service negative test PASS does **not** establish fully independent production-level per-university isolation or ongoing permissions monitoring. Signed/reproducible Node and npm distribution, WAL/log/backup ACL governance, secret custody, trusted update channel, off-host restore, real Central/Keycloak and operator-approved installation also remain outstanding. The old Node 18 `pkg` target is not a validated packaging route for Node 22/native SQLite. No production service or data was changed by the hosted QA.

See [Node Service Installation Acceptance](docs/WINDOWS_NODE_SERVICE_INSTALL_ACCEPTANCE.md).

---

## Table of Contents

* [Installation](#installation)
* [Folder Structure](#folder-structure)
* [Usage](#usage)
* [Self-Update Flow](#self-update-flow)
* [Releasing a New Version](#releasing-a-new-version)
* [Development](#development)

---

## Installation

1. No production-signed `agentctl.exe` distribution is accepted yet. For isolated QA, use only the reviewed source and pinned CI evidence described in the [Windows acceptance report](docs/WINDOWS_NODE_SERVICE_INSTALL_ACCEPTANCE.md); do not treat the historical Node 18 `pkg` output as a vetted release.
2. Place it in `C:\Program Files\TenantAgent\bin\`.
3. Add to your PATH if desired.

---

## Legacy development folder structure (not a release manifest)

```
agentctl/src/
├─ cli/commands/update/          # CLI layer (UX only)
│   ├─ index.ts                  # Main command handler
│   ├─ flags.ts                  # CLI flags (--check, --yes)
│   ├─ prompt.ts                 # Confirmation prompts
│   └─ output.ts                 # Console messages
├─ core/self-update/             # Core update logic
│   ├─ check-version.ts
│   ├─ prepare-update.ts
│   ├─ download.ts
│   ├─ verify.ts
│   ├─ run-updater.ts
│   ├─ rollback.ts
│   └─ types.ts
├─ platform/windows/self-update/ # Windows updater
│   ├─ updater.ps1.ts
│   ├─ file-lock.ts
│   └─ paths.ts
├─ services/github/              # GitHub release integration
│   ├─ releases.ts
│   └─ assets.ts
├─ utils/                        # Utility modules
│   ├─ exec.ts                   # runCommand() wrapper
│   ├─ fs.ts
│   ├─ logger.ts
│   └─ ...
```

---

## Usage

Run commands from the terminal:

```bash
# Check agentctl version
agentctl agent version

# Start agent
agentctl agent start

# Stop agent
agentctl agent stop

# Update agentctl to latest version
agentctl update --yes

# Only check for updates without installing
agentctl update --check
```

---

## Self-Update Flow

```
CLI (commands/update)
       ↓
Core (self-update/index.ts)
       ↓
GitHub (services/github)
       ↓
Download & verify
       ↓
Platform (windows/self-update/runUpdater)
       ↓
Replace agentctl.exe
       ↓
Rollback if failure
       ↓
Success
```

* **Not an accepted production updater** — only controlled signed artifact/synthetic rollback QA
* **Backup & rollback** supported
* Only runs on **Windows**

---

## Releasing a New Version on GitHub

1. **Update version** in `package.json` or `AGENTCTL_VERSION`.
2. **Build Windows binary**: `agentctl.exe`.
3. **Generate SHA256 checksum**:

```powershell
Get-FileHash .\dist\agentctl.exe -Algorithm SHA256 | ForEach-Object { $_.Hash } > agentctl.exe.sha256
```

4. **Tag Git version**:

```bash
git tag -a v1.2.0 -m "Release agentctl v1.2.0"
git push origin v1.2.0
```

5. **Create GitHub release**:

   * Tag: `v1.2.0`
   * Title: `agentctl v1.2.0`
   * Description: release notes
   * Upload assets:

     * `agentctl.exe`
     * `agentctl.exe.sha256`

6. **Publish release**

7. Test self-update with:

```bash
agentctl update --yes
```

---

## Development

* Install dependencies:

```bash
npm install
```

* Build project:

```bash
npm run build
```

* Run CLI in development:

```bash
node dist/agentctl.js <command>
```

* Run tests (if you add unit tests):

```bash
npm test
```

---

## Notes

* **Windows only** (self-update uses PowerShell)
* **No production rollback guarantees** until real signed installer/update delivery, genuine tenant-agent packaging and operator recovery drills pass independently.
* GitHub release assets must include both `.exe` and `.sha256`
