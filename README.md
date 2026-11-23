# AgentCTL

**AgentCTL** is a Windows-focused command-line tool for managing the **Tenant Agent**. It includes:

* Agent lifecycle commands (`start`, `stop`, `restart`, `status`)
* Config and outbox management
* Self-update system that safely updates the running binary

**Release status: PRODUCTION NO-GO.** GitHub-hosted Windows QA verifies a disposable NSSM service lifecycle, signed-update checks, and simulated rollback. This is **not** an approved production updater, a signed installer, or evidence that the real tenant-agent binary is deployable.

### Integration blocker (2026-11-23)

The existing `agentctl install` expects `C:\\Program Files\\TenantAgent\\bin\\tenant-agent.exe`, `agentctl.exe`, `nssm.exe` and a protected `C:\\ProgramData\\TenantAgent\\config\\agent.env`. However, `myothein/tenant-agent` currently compiles to a Node.js `dist/index.js`, **not** a signed `tenant-agent.exe`. A hosted Windows co-repository compatibility test validates that the missing EXE prevents the installer from contacting Windows SCM.

Six-repository QA evidence: https://github.com/myothein/tenant-agent/actions/runs/45095727438 . The hosted Windows runner executes the real tenant-agent Node process restart/recovery test and pinned agentctl safety tests, but it **does not** install the genuine tenant-agent as a Windows service. Existing agentctl NSSM QA installs a synthetic worker only.

The historical `pkg` target uses Node 18; **do not assume** it can safely bundle or support the Node 22 agent/native SQLite configuration. Choose and security-review a packaging strategy, verify actual signed release artifacts, protected configuration/NTFS ACLs, real Windows service lifecycle and independent rollback before any GO decision. The sample release steps in this README are illustrative only: a checksum file by itself is not a trusted signature.

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

1. Download the latest `agentctl.exe` from the [GitHub Releases](https://github.com/your-org/agentctl/releases) page.
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

* Fully **atomic update**
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
