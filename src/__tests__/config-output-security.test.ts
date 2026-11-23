import test from 'node:test';
import assert from 'node:assert/strict';
import { safeConfigurationKey, safeConfigurationValue } from '../utils/config-redaction';

const placeholder = 'synthetic-secret-token-never-emit-0123456789';

test('secret configuration values are never disclosed by output formatting', () => {
    for (const key of [
        'DATABASE_URL', 'CENTRAL_AGENT_API_KEY', 'ADMIN_PASSWORD',
        'JWT_PRIVATE_KEY', 'OIDC_ACCESS_TOKEN', 'CLIENT_SECRET',
        'AWS_SECRET_ACCESS_KEY', 'CUSTOM_CREDENTIAL', 'UNRECOGNIZED_SETTING'
    ]) {
        assert.equal(safeConfigurationValue(key, placeholder), '[REDACTED]', key);
    }
});

test('nonsecret operational fields preserve valid values', () => {
    assert.equal(safeConfigurationValue('TENANT_ID', 'university-a'), 'university-a');
    assert.equal(safeConfigurationValue('AGENT_PORT', '5001'), '5001');
    assert.equal(safeConfigurationValue('LOG_LEVEL', 'info'), 'info');
    assert.equal(safeConfigurationValue('NODE_ENV', 'production'), 'production');
    assert.equal(safeConfigurationValue('SYNC_INTERVAL', '30s'), '30s');
});

test('only strict allowlisted values may appear in public config output', () => {
    const cases: Array<[string, string]> = [
        ['TENANT_ID', placeholder],
        ['TENANT_ID', 'valid\ninjected'],
        ['AGENT_PORT', '0'], ['AGENT_PORT', '70000'],
        ['LOG_LEVEL', 'info\nCENTRAL_API_KEY=leak'],
        ['NODE_ENV', 'production # injected'],
        ['SYNC_INTERVAL', '30s\nsecret'],
        ['CUSTOM_PUBLIC_KEY', 'insecure-value'],
        ['TENANT_ID', 'a'.repeat(129)]
    ];
    for (const [key, value] of cases) {
        assert.equal(safeConfigurationValue(key, value), '[REDACTED]', key);
    }
});

test('malformed configuration keys cannot inject log or terminal content', () => {
    assert.equal(safeConfigurationKey('TENANT_ID'), 'TENANT_ID');
    assert.equal(safeConfigurationKey('API_KEY\nsecret=abc'), '[INVALID_KEY]');
    assert.equal(safeConfigurationKey('BAD KEY'), '[INVALID_KEY]');
    assert.equal(safeConfigurationKey('=CONTAINS=EQUALS'), '[INVALID_KEY]');
});
