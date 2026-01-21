import { execSync } from 'child_process';
import os from 'os';

/**
 * Check if the current process has admin/root privileges
 */
export function isAdmin(): boolean {
    if (os.platform() !== 'win32') {
        // Unix-like: safely get UID
        let uid: number = -1; // default non-root
        if (typeof process.getuid === 'function') {
            const tmp = process.getuid();
            uid = typeof tmp === 'number' ? tmp : -1;
        }
        return uid === 0; // TypeScript now knows this is boolean
    }

    // Windows: try fsutil
    try {
        execSync('fsutil dirty query %systemdrive%', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensure admin privileges, exit process if not
 */
export function ensureAdmin(): void {
    if (!isAdmin()) {
        console.error('❌ Administrator privileges are required.');
        console.error('Please run this command in an elevated terminal.');
        process.exit(1);
    }
}
