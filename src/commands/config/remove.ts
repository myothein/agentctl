import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { ensureAdmin } from '../../utils/admin';
import { readEnvFile, writeEnvFile } from '../../utils/env-config';
import logger from '../../utils/logger';
import { backupConfig } from '../../utils/config-backup';

const CONFIG_FILE = path.join(
    'C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env'
);

export const configRemove = new Command('remove')
    .argument('<key>', 'Config key')
    .description('Remove a config key')
    .action((key) => {
        ensureAdmin();

        const config = readEnvFile(CONFIG_FILE);

        if (!(key in config)) {
            console.log(chalk.yellow('⚠ Key not found'));
            return;
        }

        // 🔹 Auto backup
        const backupFile = backupConfig();
        if (backupFile) console.log(`ℹ Backup created: ${backupFile}`);

        delete config[key];
        writeEnvFile(CONFIG_FILE, config);

        logger.info(`Config removed: ${key}`);
        console.log(chalk.green(`✅ ${key} removed`));
        console.log('ℹ Restart tenant-agent to apply changes');
    });
