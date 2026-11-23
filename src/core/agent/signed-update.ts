import {
    createHash, createPublicKey, verify as verifySignature, timingSafeEqual
} from 'node:crypto';

/**
 * Canonical, domain-separated signature format for tenant-agent service binaries.
 * The Ed25519 private signing key must NEVER live in the source repository or GitHub CI.
 */
export interface SignedAgentManifest {
    schemaVersion: 1;
    version: string;
    sha256: string;
    signature: string;
}
export function manifestSigningMessage(version: string, sha256: string): Buffer {
    return Buffer.from('tenant-agent-update/v1\n' + version + '\n' + sha256.toLowerCase() + '\n', 'utf8');
}
export function verifySignedAgentBinary(
    binary: Buffer,
    manifest: SignedAgentManifest,
    trustedPublicKeyPem: string
): void {
    if (!Buffer.isBuffer(binary) || binary.length === 0 || binary.length > 250 * 1024 * 1024) {
        throw new Error('Invalid update artifact size');
    }
    if (!manifest || manifest.schemaVersion !== 1 ||
        typeof manifest.version !== 'string' ||
        !/^[0-9]+[.][0-9]+[.][0-9]+(?:-[A-Za-z0-9.-]{1,64})?$/.test(manifest.version) ||
        typeof manifest.sha256 !== 'string' ||
        !/^[0-9a-f]{64}$/i.test(manifest.sha256) ||
        typeof manifest.signature !== 'string' ||
        !/^[A-Za-z0-9+/]{86}==$/.test(manifest.signature)) {
        throw new Error('Invalid signed update manifest');
    }
    // Canonical base64 prevents alternative representations bypassing reviews.
    const signature=Buffer.from(manifest.signature, 'base64');
    if (signature.length !== 64 || signature.toString('base64') !== manifest.signature) {
        throw new Error('Invalid update signature encoding');
    }
    const actualHash=createHash('sha256').update(binary).digest();
    const expectedHash=Buffer.from(manifest.sha256,'hex');
    if (!timingSafeEqual(actualHash,expectedHash)) {
        throw new Error('Update artifact SHA-256 mismatch');
    }
    let key: ReturnType<typeof createPublicKey>;
    try { key=createPublicKey(trustedPublicKeyPem); }
    catch { throw new Error('Trusted Ed25519 public key not provisioned'); }
    if (key.asymmetricKeyType !== 'ed25519') {
        throw new Error('Update trust root must be Ed25519');
    }
    if (!verifySignature(null,manifestSigningMessage(manifest.version,manifest.sha256),key,signature)) {
        throw new Error('Update manifest signature invalid');
    }
}
