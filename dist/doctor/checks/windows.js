"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowsChecks = windowsChecks;
exports.printWindowsReport = printWindowsReport;
const fs_1 = __importDefault(require("fs"));
const exec_1 = require("../../utils/exec");
const admin_1 = require("../../utils/admin");
const service_1 = require("../../constants/service");
const paths_1 = require("../../constants/paths");
/**
 * Perform all Windows preflight checks for Tenant Agent.
 */
async function windowsChecks() {
    const results = [];
    // -----------------------------
    // 1️⃣ Administrator privileges
    // -----------------------------
    const admin = (0, admin_1.isAdmin)();
    results.push({
        name: 'Administrator privileges',
        ok: admin,
        message: admin
            ? 'Running as Administrator ✅'
            : 'Not running as Administrator ❌',
    });
    // -----------------------------
    // 2️⃣ NSSM available
    // -----------------------------
    try {
        const nssmCheck = await (0, exec_1.runCommand)('where', ['nssm'], { silent: true });
        results.push({
            name: 'NSSM available',
            ok: nssmCheck.code === 0,
            message: nssmCheck.code === 0
                ? `Found at: ${nssmCheck.stdout.trim()} ✅`
                : 'NSSM not found in PATH ❌',
        });
    }
    catch {
        results.push({
            name: 'NSSM available',
            ok: false,
            message: 'NSSM not found in PATH ❌',
        });
    }
    // -----------------------------
    // 3️⃣ Directory existence checks
    // -----------------------------
    const dirs = {
        BASE_DIR: paths_1.BASE_DIR,
        BIN_DIR: paths_1.BIN_DIR,
        CONFIG_DIR: paths_1.CONFIG_DIR,
        DATA_DIR: paths_1.DATA_DIR,
        LOG_DIR: paths_1.LOG_DIR,
        AGENT_LOG_DIR: paths_1.AGENT_LOG_DIR,
        AGENTCTL_LOG_DIR: paths_1.AGENTCTL_LOG_DIR,
    };
    for (const [name, dir] of Object.entries(dirs)) {
        const exists = fs_1.default.existsSync(dir);
        results.push({
            name: `Directory: ${name}`,
            ok: exists,
            message: exists ? `Exists: ${dir} ✅` : `Missing: ${dir} ❌`,
        });
    }
    // -----------------------------
    // 4️⃣ Service check
    // -----------------------------
    try {
        const serviceCheck = await (0, exec_1.runCommand)('sc', ['query', service_1.SERVICE_NAME], { silent: true });
        results.push({
            name: `Service: ${service_1.SERVICE_NAME}`,
            ok: serviceCheck.code === 0,
            message: serviceCheck.code === 0
                ? 'Service exists ✅'
                : 'Service not installed ❌',
        });
    }
    catch {
        results.push({
            name: `Service: ${service_1.SERVICE_NAME}`,
            ok: false,
            message: 'Service not installed ❌',
        });
    }
    return results;
}
/**
 * Prints the Agent Doctor report in console-friendly format.
 */
async function printWindowsReport() {
    const results = await windowsChecks();
    console.log('\nAgent Doctor Report');
    console.log('==================\n');
    let allOk = true;
    for (const r of results) {
        console.log(`${r.ok ? '✅' : '❌'} ${r.name}: ${r.message}`);
        if (!r.ok)
            allOk = false;
    }
    console.log('\nSummary:', allOk ? '✅ All checks passed' : '⚠️ Some checks failed', '\n');
}
//# sourceMappingURL=windows.js.map