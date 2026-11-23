import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { ensureAdmin } from '../../utils/admin';
import { readEnvFile, writeEnvFile } from '../../utils/env-config';
import logger from '../../utils/logger';
import { parseNonSecretCliAssignment } from '../../utils/config-redaction';
import { backupConfig } from '../../utils/config-backup';

const CONFIG_FILE = path.join(
    'C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env'
);

export const configSet = new Command('set')
    .argument('<pair>', 'KEY=VALUE')
    .description('Set or update a config value')
    .action((pair) => {
        // Validate before privilege checks, backups or any disk writes.
        // Secrets cannot safely appear in command-line arguments.
        let assignment: { key: string; value: string };
        try {
            assignment = parseNonSecretCliAssignment(pair);
        } catch {
            console.error('Unsafe configuration assignment; provision secrets through a protected channel');
            process.exitCode = 1;
            return;
        }
        const { key, value } = assignment;
        ensureAdmin();

        const config = readEnvFile(CONFIG_FILE);
        const existed = key in config;

        // 🔹 Auto backup
        const backupFile = backupConfig();
        if (backupFile) console.log(`ℹ Backup created: ${backupFile}`);

        config[key] = value;
        writeEnvFile(CONFIG_FILE, config);

        logger.info(`Config ${existed ? 'updated' : 'set'}: ${key}`);
        console.log(chalk.green(`✅ ${key} ${existed ? 'updated' : 'set'}`));
        console.log('ℹ Restart tenant-agent to apply changes');
    });
