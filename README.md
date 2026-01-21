# AgentCTL

**AgentCTL** is a Windows-focused command-line tool for managing the **Tenant Agent**. It includes:

* Agent lifecycle commands (`start`, `stop`, `restart`, `status`)
* Config and outbox management
* Self-update system that safely updates the running binary

This tool is production-ready and supports **atomic updates with rollback**.

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

## Folder Structure (Production-Ready)

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
* Fully **rollback-safe**
* GitHub release assets must include both `.exe` and `.sha256`
