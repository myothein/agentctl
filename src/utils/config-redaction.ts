/** Default-deny display policy for agent configuration.
 * Keep raw secrets available only inside the protected configuration store.
 * Operator-facing output must never reveal arbitrary keys/values.
 */
const PUBLIC_CONFIGURATION_KEYS = new Set([
    'TENANT_ID', 'AGENT_PORT', 'LOG_LEVEL', 'HEARTBEAT_INTERVAL',
    'SYNC_INTERVAL', 'NODE_ENV'
]);

export function safeConfigurationValue(key: string, value: string): string {
    if (!PUBLIC_CONFIGURATION_KEYS.has(key)) return '[REDACTED]';
    if (typeof value !== 'string' || value.length > 128 ||
        /[\r\n\x00-\x1f\x7f]/.test(value)) return '[REDACTED]';
    switch (key) {
        case 'TENANT_ID':
            return /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : '[REDACTED]';
        case 'AGENT_PORT': {
            const port = Number(value);
            return /^\d{1,5}$/.test(value) && Number.isInteger(port) &&
                port >= 1 && port <= 65535 ? value : '[REDACTED]';
        }
        case 'LOG_LEVEL':
            return /^(trace|debug|info|warn|error|fatal)$/.test(value) ?
                value : '[REDACTED]';
        case 'NODE_ENV':
            return /^(development|test|production)$/.test(value) ?
                value : '[REDACTED]';
        case 'HEARTBEAT_INTERVAL':
        case 'SYNC_INTERVAL':
            return /^\d{1,8}(?:ms|s|m|h)$/.test(value) ? value : '[REDACTED]';
        default:
            return '[REDACTED]';
    }
}

/** Never interpolate unvalidated configuration names into logs or terminals. */
export function safeConfigurationKey(key: string): string {
    return /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(key) ? key : '[INVALID_KEY]';
}


/** This legacy CLI uses KEY=VALUE arguments, which OS process listings and
 * shell history may retain. Reject any likely credential-bearing assignment.
 * These must be provisioned through an approved protected configuration path.
 */
export function parseNonSecretCliAssignment(pair: unknown): { key: string; value: string } {
    if (typeof pair !== 'string' || pair.length > 2048) {
        throw new Error('Invalid configuration assignment');
    }
    const pos = pair.indexOf('=');
    if (pos <= 0) throw new Error('Expected KEY=VALUE');
    const key = pair.slice(0, pos);
    const value = pair.slice(pos + 1);
    if (safeConfigurationKey(key) !== key ||
        /[\r\n\x00-\x1f\x7f]/.test(value) ||
        /(?:^|_)(?:KEY|TOKEN|PASSWORD|PASSWD|SECRET|CREDENTIAL|AUTH|DSN|CERT|CERTIFICATE|PRIVATE|DATABASE_URL)(?:_|$)/i.test(key)) {
        throw new Error('Unsafe configuration assignment: use protected secret provisioning');
    }
    return { key, value };
}
