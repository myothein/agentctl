import { UpdateFlags, UpdateResult } from './types';
import { checkVersion } from './check-version';

/**
 * Legacy agentctl self-update used to replace the running executable using
 * an untrusted PowerShell route. Keep version *checks* only until the signed
 * update flow and dedicated Windows SCM acceptance are approved.
 */
export async function checkVersionAndUpdate(flags:UpdateFlags):Promise<UpdateResult> {
    if (!flags.check) {
        throw new Error('Legacy agentctl self-update blocked pending signed update and rollback acceptance');
    }
    const latest=await checkVersion();
    return {updated:false,version:latest};
}
