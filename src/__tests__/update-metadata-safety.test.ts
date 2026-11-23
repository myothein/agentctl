import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestVersion } from '../update/latest-version';
import { checkUpdate } from '../update/check-update';
import { autoUpdate } from '../update/auto-update';
import { applyUpdate } from '../update/apply';

test('no fabricated remote release version or local update artifact is advertised', async () => {
    await assert.rejects(getLatestVersion(), /signed manifest and approved release source/);
    await assert.rejects(checkUpdate(), /signed manifest and approved release source/);
});

test('automatic update cannot claim success without authenticated release metadata', async () => {
    await assert.rejects(autoUpdate(), /signed manifest and approved release source/);
});

test('direct update remains fail-closed until signed release and Windows SCM acceptance', async () => {
    await assert.rejects(applyUpdate('C:\\temp\\unverified-tenant-agent.exe'), /blocked/);
});
