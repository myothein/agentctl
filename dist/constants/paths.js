"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENTCTL_LOG_DIR = exports.AGENT_LOG_DIR = exports.LOG_DIR = exports.DATA_DIR = exports.CONFIG_DIR = exports.BIN_DIR = exports.BASE_DIR = void 0;
exports.assertPathExists = assertPathExists;
exports.validateInstallation = validateInstallation;
exports.ensureDirsExist = ensureDirsExist;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
exports.BASE_DIR = path_1.default.dirname(process.execPath); // EXE folder
exports.BIN_DIR = path_1.default.join(exports.BASE_DIR, 'bin');
// -----------------------------
// 2️⃣ Data, config, and logs (ProgramData)
// -----------------------------
exports.CONFIG_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'config');
exports.DATA_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'data');
exports.LOG_DIR = path_1.default.join('C:', 'ProgramData', 'TenantAgent', 'logs');
// -----------------------------
// 3️⃣ Logs subdirectories
// -----------------------------
exports.AGENT_LOG_DIR = path_1.default.join(exports.LOG_DIR, 'agent');
exports.AGENTCTL_LOG_DIR = path_1.default.join(exports.LOG_DIR, 'agentctl');
// -----------------------------
// 4️⃣ Helper: verify directory exists
// -----------------------------
function assertPathExists(dir, label) {
    if (!fs_1.default.existsSync(dir)) {
        throw new Error(`${label} does not exist: ${dir}\n` +
            `Tenant Agent may not be installed correctly.`);
    }
}
// -----------------------------
// 5️⃣ Optional: preflight validation
// -----------------------------
function validateInstallation() {
    const dirs = [
        { path: exports.BASE_DIR, label: 'Base directory (BIN)' },
        { path: exports.BIN_DIR, label: 'BIN directory' },
        { path: exports.CONFIG_DIR, label: 'Config directory' },
        { path: exports.DATA_DIR, label: 'Data directory' },
        { path: exports.LOG_DIR, label: 'Logs directory' },
        { path: exports.AGENT_LOG_DIR, label: 'Agent logs directory' },
        { path: exports.AGENTCTL_LOG_DIR, label: 'AgentCTL logs directory' },
    ];
    for (const { path: dir, label } of dirs) {
        assertPathExists(dir, label);
    }
}
// -----------------------------
// 6️⃣ Optional: helper for creating directories if missing
// (useful for first install, but Doctor checks do not auto-create)
// -----------------------------
function ensureDirsExist() {
    const dirs = [
        exports.BIN_DIR,
        exports.CONFIG_DIR,
        exports.DATA_DIR,
        exports.LOG_DIR,
        exports.AGENT_LOG_DIR,
        exports.AGENTCTL_LOG_DIR,
    ];
    dirs.forEach(dir => {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    });
}
//# sourceMappingURL=paths.js.map