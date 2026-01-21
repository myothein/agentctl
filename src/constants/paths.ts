import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * =============================
 * Tenant Agent Paths
 * =============================
 *
 * - BIN_DIR and BASE_DIR → C:\Program Files\TenantAgent (where EXEs live)
 * - CONFIG/DATA/LOGS → C:\ProgramData\TenantAgent (shared data, logs)
 * - Works for EXE builds (pkg) and Node.js dev mode
 */

// -----------------------------
// 1️⃣ Base directory for binaries
// -----------------------------
export const BASE_DIR = path.dirname(process.execPath); // EXE folder
export const BIN_DIR = path.join(BASE_DIR, 'bin');

// -----------------------------
// 2️⃣ Data, config, and logs (ProgramData)
// -----------------------------
export const CONFIG_DIR = path.join('C:', 'ProgramData', 'TenantAgent', 'config');
export const DATA_DIR = path.join('C:', 'ProgramData', 'TenantAgent', 'data');
export const LOG_DIR = path.join('C:', 'ProgramData', 'TenantAgent', 'logs');

// -----------------------------
// 3️⃣ Logs subdirectories
// -----------------------------
export const AGENT_LOG_DIR = path.join(LOG_DIR, 'agent');
export const AGENTCTL_LOG_DIR = path.join(LOG_DIR, 'agentctl');

// -----------------------------
// 4️⃣ Helper: verify directory exists
// -----------------------------
export function assertPathExists(dir: string, label: string) {
    if (!fs.existsSync(dir)) {
        throw new Error(
            `${label} does not exist: ${dir}\n` +
            `Tenant Agent may not be installed correctly.`
        );
    }
}

// -----------------------------
// 5️⃣ Optional: preflight validation
// -----------------------------
export function validateInstallation() {
    const dirs: { path: string; label: string }[] = [
        { path: BASE_DIR, label: 'Base directory (BIN)' },
        { path: BIN_DIR, label: 'BIN directory' },
        { path: CONFIG_DIR, label: 'Config directory' },
        { path: DATA_DIR, label: 'Data directory' },
        { path: LOG_DIR, label: 'Logs directory' },
        { path: AGENT_LOG_DIR, label: 'Agent logs directory' },
        { path: AGENTCTL_LOG_DIR, label: 'AgentCTL logs directory' },
    ];

    for (const { path: dir, label } of dirs) {
        assertPathExists(dir, label);
    }
}

// -----------------------------
// 6️⃣ Optional: helper for creating directories if missing
// (useful for first install, but Doctor checks do not auto-create)
// -----------------------------
export function ensureDirsExist() {
    const dirs = [
        BIN_DIR,
        CONFIG_DIR,
        DATA_DIR,
        LOG_DIR,
        AGENT_LOG_DIR,
        AGENTCTL_LOG_DIR,
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}
