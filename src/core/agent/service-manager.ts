import { execSync } from 'child_process';
import { SERVICE_NAME } from '../../constants/service.js';
import { ensureAdmin } from '../../core/system/admin.js';

/**
 * Check if tenant-agent service is running
 */
export function isServiceRunning(): boolean {
    try {
        const output = execSync(`sc query "${SERVICE_NAME}"`, { encoding: 'utf-8' });
        return output.includes('RUNNING');
    } catch {
        return false;
    }
}

/**
 * Start the tenant-agent service
 */
export function startService() {
    ensureAdmin();

    if (isServiceRunning()) {
        console.log(`✅ Service "${SERVICE_NAME}" is already running`);
        return;
    }

    try {
        execSync(`sc start "${SERVICE_NAME}"`, { stdio: 'inherit' });
        console.log(`✅ Service "${SERVICE_NAME}" started`);
    } catch (err: any) {
        console.error(`❌ Failed to start service: ${err.message || err}`);
        throw err;
    }
}

/**
 * Stop the tenant-agent service
 */
export function stopService() {
    ensureAdmin();

    if (!isServiceRunning()) {
        console.log(`✅ Service "${SERVICE_NAME}" is not running`);
        return;
    }

    try {
        execSync(`sc stop "${SERVICE_NAME}"`, { stdio: 'inherit' });
        console.log(`✅ Service "${SERVICE_NAME}" stopped`);
    } catch (err: any) {
        console.error(`❌ Failed to stop service: ${err.message || err}`);
        throw err;
    }
}

/**
 * Restart the tenant-agent service
 */
export function restartService() {
    ensureAdmin();
    stopService();
    startService();
}

/**
 * Stop service if running (used for backup/restore)
 */
export function stopServiceIfRunning() {
    if (isServiceRunning()) stopService();
}
