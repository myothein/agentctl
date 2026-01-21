import path from 'path';
import os from 'os';

export const AGENTCTL_EXE = process.execPath;
export const AGENTCTL_BACKUP = AGENTCTL_EXE + '.bak';

export function getTempUpdateFolder(): string {
    return path.join(os.tmpdir(), `agentctl-update-${Date.now()}`);
}

export function getProgramFilesPath(subPath: string): string {
    const base = process.env['ProgramFiles'] || 'C:\\Program Files';
    return path.join(base, subPath);
}
