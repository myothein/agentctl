import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SERVICE_NAME } from '../../constants/service';
import { resolveWindowsServiceSid, verifyNodeServiceSecurity,
    verifyNodeBackupProvisioning } from './windows-security-preflight';

type Result = { code: number; stdout: string; stderr: string };
export type ServiceTransition = 'start' | 'restart';
export type TransitionOutcome = 'already-running' | 'started' | 'restarted';

const programFiles = path.win32.join('C:\\', 'Program Files', 'TenantAgent');
const programData = path.win32.join('C:\\', 'ProgramData', 'TenantAgent');
const installed = {
    nodeExe: path.win32.join('C:\\', 'Program Files', 'nodejs', 'node.exe'),
    nssmExe: path.win32.join(programFiles, 'bin', 'nssm.exe'),
    entryFile: path.win32.join(programFiles, 'app', 'dist', 'index.js'),
    configFile: path.win32.join(programData, 'config', 'agent.env'),
    workingDir: path.win32.join(programData, 'runtime')
};

/** No compatibility fallback to unreviewed legacy EXE service identity. */
export function assertInstalledNodeService(
    registered: Record<'Application'|'AppParameters'|'AppDirectory'|'ObjectName',string>
): void {
    const expectedParams = '"--env-file=' + installed.configFile + '" "' +
        installed.entryFile + '"';
    const expected: typeof registered = {
        Application: installed.nodeExe,
        AppParameters: expectedParams,
        AppDirectory: installed.workingDir,
        ObjectName: 'NT AUTHORITY\\LocalService'
    };
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
        if (registered[key].trim() !== expected[key]) {
            // Neither returned NSSM values nor paths belong in CLI diagnostics.
            throw new Error('Windows Node service registration does not match reviewed configuration');
        }
    }
}

function readTrustedUtility(exe: string, args: string[]): string {
    try {
        return execFileSync(exe, args, {
            windowsHide: true, timeout: 5000, encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024
        }).trim();
    } catch {
        throw new Error('Windows Node service read-only preflight failed');
    }
}

/** Re-check after configuration or ACL drift, before every CLI start/restart. */
export function verifyNodeServiceBeforeStart(): void {
    if (process.platform !== 'win32') {
        throw new Error('Windows service preflight requires Windows');
    }
    const sid = resolveWindowsServiceSid(SERVICE_NAME);
    if (!/SERVICE_SID_TYPE\s*:\s*UNRESTRICTED/i.test(
        readTrustedUtility('sc.exe', ['qsidtype', SERVICE_NAME])
    ) || !/SERVICE_START_NAME\s*:\s*NT AUTHORITY\\LocalService/i.test(
        readTrustedUtility('sc.exe', ['qc', SERVICE_NAME])
    )) {
        throw new Error('Windows service identity is not least-privilege');
    }
    const keys = ['Application','AppParameters','AppDirectory','ObjectName'] as const;
    const registered = {} as Record<typeof keys[number], string>;
    for (const key of keys) {
        registered[key] = readTrustedUtility(installed.nssmExe,
            ['get', SERVICE_NAME, key]);
    }
    assertInstalledNodeService(registered);
    verifyNodeServiceSecurity({
        ...installed, serviceAccount: 'NT AUTHORITY\\LocalService',
        serviceSid: sid
    });
    verifyNodeBackupProvisioning({
        configFile: installed.configFile, entryFile: installed.entryFile,
        workingDir: installed.workingDir, serviceSid: sid
    });
}

/**
 * Only a successfully audited service may be started or restarted. The
 * injected runner allows unit tests to prove zero service mutation when
 * preflight, status, or stop fails.
 */
export async function transitionVerifiedService(
    operation: ServiceTransition,
    preflight: () => void | Promise<void>,
    run: (args: string[]) => Promise<Result>,
    serviceName: string = SERVICE_NAME
): Promise<TransitionOutcome> {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(serviceName) ||
        !['start', 'restart'].includes(operation)) {
        throw new Error('Invalid Windows service transition');
    }
    await preflight();
    const status = await run(['status', serviceName]);
    if (status.code !== 0) {
        throw new Error('Windows service status unavailable');
    }
    const state = status.stdout.trim();
    if (state !== 'SERVICE_RUNNING' && state !== 'SERVICE_STOPPED') {
        throw new Error('Unrecognized Windows service state');
    }
    if (operation === 'start' && state === 'SERVICE_RUNNING') return 'already-running';
    if (operation === 'restart' && state === 'SERVICE_RUNNING') {
        const stopped = await run(['stop', serviceName]);
        if (stopped.code !== 0) throw new Error('Windows service stop failed');
        const afterStop = await run(['status', serviceName]);
        if (afterStop.code !== 0 || afterStop.stdout.trim() !== 'SERVICE_STOPPED') {
            throw new Error('Windows service did not stop cleanly');
        }
    }
    const started = await run(['start', serviceName]);
    if (started.code !== 0) throw new Error('Windows service start failed');
    return operation === 'restart' ? 'restarted' : 'started';
}
