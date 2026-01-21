import { execSync } from 'child_process';

export function isAdmin(): boolean {
    try {
        // This command will succeed only if running as admin
        // It tries to list the SYSTEM drive ACL
        execSync('fsutil dirty query %systemdrive%', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

export function ensureAdmin(): void {
    if (!isAdmin()) {
        throw new Error(
            'Administrator privileges are required to run this command. ' +
            'Please re-run agentctl as Administrator.'
        );
    }
}
