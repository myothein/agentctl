import fs from 'fs';
import { runCommand } from '../../utils/exec';
import { isAdmin } from '../../utils/admin';
import { SERVICE_NAME } from '../../constants/service';
import {
    BASE_DIR,
    BIN_DIR,
    CONFIG_DIR,
    DATA_DIR,
    LOG_DIR,
    AGENT_LOG_DIR,
    AGENTCTL_LOG_DIR,
} from '../../constants/paths';

export interface CheckResult {
    name: string;
    ok: boolean;
    message: string;
}

/**
 * Perform all Windows preflight checks for Tenant Agent.
 */
export async function windowsChecks(): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // -----------------------------
    // 1️⃣ Administrator privileges
    // -----------------------------
    const admin = isAdmin();
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
        const nssmCheck = await runCommand('where', ['nssm'], { silent: true });
        results.push({
            name: 'NSSM available',
            ok: nssmCheck.code === 0,
            message:
                nssmCheck.code === 0
                    ? `Found at: ${nssmCheck.stdout.trim()} ✅`
                    : 'NSSM not found in PATH ❌',
        });
    } catch {
        results.push({
            name: 'NSSM available',
            ok: false,
            message: 'NSSM not found in PATH ❌',
        });
    }

    // -----------------------------
    // 3️⃣ Directory existence checks
    // -----------------------------
    const dirs: Record<string, string> = {
        BASE_DIR,
        BIN_DIR,
        CONFIG_DIR,
        DATA_DIR,
        LOG_DIR,
        AGENT_LOG_DIR,
        AGENTCTL_LOG_DIR,
    };

    for (const [name, dir] of Object.entries(dirs)) {
        const exists = fs.existsSync(dir);
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
        const serviceCheck = await runCommand('sc', ['query', SERVICE_NAME], { silent: true });
        results.push({
            name: `Service: ${SERVICE_NAME}`,
            ok: serviceCheck.code === 0,
            message:
                serviceCheck.code === 0
                    ? 'Service exists ✅'
                    : 'Service not installed ❌',
        });
    } catch {
        results.push({
            name: `Service: ${SERVICE_NAME}`,
            ok: false,
            message: 'Service not installed ❌',
        });
    }

    return results;
}

/**
 * Prints the Agent Doctor report in console-friendly format.
 */
export async function printWindowsReport() {
    const results = await windowsChecks();
    console.log('\nAgent Doctor Report');
    console.log('==================\n');

    let allOk = true;

    for (const r of results) {
        console.log(`${r.ok ? '✅' : '❌'} ${r.name}: ${r.message}`);
        if (!r.ok) allOk = false;
    }

    console.log('\nSummary:', allOk ? '✅ All checks passed' : '⚠️ Some checks failed', '\n');
}
