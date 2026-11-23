import { Command } from 'commander';
import path from 'node:path';
import { ensureAdmin } from '../../utils/admin';
import { readEnvFile, writeEnvFile } from '../../utils/env-config';
import { parseNonSecretCliAssignment } from '../../utils/config-redaction';
import { backupConfig } from '../../utils/config-backup';
import { CONFIG_DIR } from '../../constants/paths';
import logger from '../../utils/logger';

// Legacy nested command is not registered in the main CLI, but may be
// exported by consumers. Enforce the same fail-closed rule as config set.
export const config = new Command('config')
    .description('Manage agent configuration');

config.command('set <keyValue>')
    .description('Set a nonsecret configuration key (format: KEY=VALUE)')
    .action((pair: string) => {
        let assignment: { key: string; value: string };
        try {
            // Do NOT log or echo raw CLI arguments. Sensitive CLI values also
            // persist in shell history/process listings; reject before IO.
            assignment = parseNonSecretCliAssignment(pair);
        } catch {
            console.error('Unsafe configuration assignment; use protected secret provisioning');
            process.exitCode = 1;
            return;
        }

        try {
            ensureAdmin();
            const file = path.join(CONFIG_DIR, 'agent.env');
            const existing = readEnvFile(file);
            const wasPresent = Object.prototype.hasOwnProperty.call(existing, assignment.key);
            backupConfig();
            // Keep other protected values intact; never echo their contents.
            existing[assignment.key] = assignment.value;
            writeEnvFile(file, existing);
            logger.info('Config ' + (wasPresent ? 'updated: ' : 'set: ') + assignment.key);
            console.log('Configuration ' + assignment.key + ' saved; restart the agent to apply');
        } catch {
            // Raw errors can include file paths or config contents.
            console.error('Configuration update refused; inspect protected diagnostics');
            process.exitCode = 1;
        }
    });
