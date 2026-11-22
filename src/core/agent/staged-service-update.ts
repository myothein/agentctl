import { createHash, timingSafeEqual } from 'node:crypto';
import { SignedAgentManifest, verifySignedAgentBinary } from './signed-update';

/**
 * A testable, staged transaction for a future real Windows SCM adapter.
 * This module has no Windows, filesystem or service side effects of its own.
 * Operators must still approve and validate the real NSSM adapter separately.
 */
export interface StagedServiceUpdateOps {
    approved: boolean;
    isServiceRunning(): Promise<boolean>;
    readInstalled(): Promise<Buffer>;
    writeBackup(contents: Buffer): Promise<void>;
    readBackup(): Promise<Buffer>;
    stopService(): Promise<void>;
    replaceInstalled(contents: Buffer): Promise<void>;
    startService(): Promise<void>;
    healthCheck(): Promise<boolean>;
    restoreInstalled(contents: Buffer): Promise<void>;
}
function sameBytes(left: Buffer, right: Buffer): boolean {
    const a=createHash('sha256').update(left).digest();
    const b=createHash('sha256').update(right).digest();
    return timingSafeEqual(a,b) && left.length===right.length;
}

/** Returns only after the new service is healthy, or throws after an attempted rollback. */
export async function runStagedSignedUpdate(
    bytes: Buffer,
    manifest: SignedAgentManifest,
    trustedPublicKeyPem: string,
    ops: StagedServiceUpdateOps
): Promise<void> {
    if (ops.approved !== true) throw new Error('Explicit operator approval required for service update');
    // Verify signed artifact BEFORE reading/changing any service state.
    verifySignedAgentBinary(bytes,manifest,trustedPublicKeyPem);
    if (!(await ops.isServiceRunning())) {
        throw new Error('Service must be running before update; state unknown or stopped');
    }
    const original=await ops.readInstalled();
    if (!Buffer.isBuffer(original) || original.length===0) {
        throw new Error('Cannot read installed service artifact');
    }
    await ops.writeBackup(original);
    const backup=await ops.readBackup();
    if (!Buffer.isBuffer(backup) || !sameBytes(original,backup)) {
        throw new Error('Backup verification failed; service not stopped');
    }
    let stopped=false;
    try {
        await ops.stopService();
        if (await ops.isServiceRunning()) {
            throw new Error('Service did not stop; refusing to replace running binary');
        }
        stopped=true;
        await ops.replaceInstalled(bytes);
        await ops.startService();
        if (!(await ops.isServiceRunning()) || !(await ops.healthCheck())) {
            throw new Error('Updated service failed post-start health verification');
        }
        return;
    } catch {
        if (!stopped) {
            // A stop operation could have stopped the service *then* failed.
            // No binary was replaced; recover original service state if necessary.
            try {
                if (!(await ops.isServiceRunning())) {
                    await ops.startService();
                    if (!(await ops.isServiceRunning()) || !(await ops.healthCheck())) {
                        throw new Error('Original service did not recover');
                    }
                }
            } catch {
                throw new Error('Service stop failed and original service recovery unverified; manual recovery required');
            }
            throw new Error('Update aborted before replacement; original service state verified');
        }
        try {
            if (await ops.isServiceRunning()) await ops.stopService();
            if (await ops.isServiceRunning()) throw new Error('Could not stop failed update');
            const restoreBytes=await ops.readBackup();
            if (!Buffer.isBuffer(restoreBytes) || !sameBytes(restoreBytes,original)) {
                throw new Error('Backup integrity failed during rollback');
            }
            await ops.restoreInstalled(restoreBytes);
            const restored=await ops.readInstalled();
            if (!sameBytes(restored,original)) throw new Error('Restored binary mismatch');
            await ops.startService();
            if (!(await ops.isServiceRunning()) || !(await ops.healthCheck())) {
                throw new Error('Restored service health check failed');
            }
        } catch {
            throw new Error('Update failed and rollback verification failed; manual recovery required');
        }
        throw new Error('Update failed; previous artifact restored and healthy');
    }
}
