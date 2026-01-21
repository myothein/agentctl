import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { ensureAdmin } from '../../utils/admin.js';
import { readEnvFile, writeEnvFile } from '../../utils/env-config';
import { backupConfig } from '../../utils/config-backup';
import logger from '../../utils/logger';

const CONFIG_FILE = path.join(
    'C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env'
);

export const configAddNew = new Command('add-new')
    .argument('<pair>', 'KEY=VALUE')
    .description('Add a new config key (fails if key exists)')
    .action((pair) => {
        ensureAdmin();

        const [key, ...rest] = pair.split('=');
        const value = rest.join('=');

        if (!key || value === undefined) {
            console.error('❌ Use KEY=VALUE');
            process.exit(1);
        }

        const config = readEnvFile(CONFIG_FILE);

        if (key in config) {
            console.error(chalk.red(`❌ ${key} already exists`));
            process.exit(1);
        }

        // 🔹 Auto backup
        const backupFile = backupConfig();
        if (backupFile) console.log(`ℹ Backup created: ${backupFile}`);

        config[key] = value;
        writeEnvFile(CONFIG_FILE, config);

        logger.info(`Config added: ${key}`);
        console.log(chalk.green(`✅ ${key} added`));
        console.log('ℹ Restart tenant-agent to apply changes');
    });
