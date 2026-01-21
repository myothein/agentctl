import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import chalk from 'chalk';
import { ensureAdmin } from '../../utils/admin';
import { readEnvFile, writeEnvFile } from '../../utils/env-config';
import logger from '../../utils/logger';

const CONFIG_DIR = path.join('C:', 'ProgramData', 'TenantAgent', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'agent.env');

// Find latest backup
function findLatestBackup(): string | null {
    if (!fs.existsSync(CONFIG_DIR)) return null;

    const files = fs.readdirSync(CONFIG_DIR)
        .filter(f => f.startsWith('agent.env.bak.'))
        .sort()
        .reverse();

    return files.length ? path.join(CONFIG_DIR, files[0]) : null;
}

// Prompt confirmation
function promptConfirm(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => {
        rl.question(question + ' (y/n) ', answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

export const configRestore = new Command('restore')
    .argument('[backup]', 'Backup file to restore (latest if omitted)')
    .description('Restore config from a backup')
    .action(async (backup) => {
        ensureAdmin();

        const backupFile = backup
            ? path.join(CONFIG_DIR, backup)
            : findLatestBackup();

        if (!backupFile || !fs.existsSync(backupFile)) {
            console.error(chalk.red('❌ Backup not found'));
            process.exit(1);
        }

        const confirm = await promptConfirm(`Are you sure you want to restore ${path.basename(backupFile)}?`);
        if (!confirm) {
            console.log('❌ Restore cancelled');
            return;
        }

        const backupConfig = readEnvFile(backupFile);

        // Optional: backup current config before overwrite
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const currentBackupFile = `${CONFIG_FILE}.pre-restore.${ts}`;
        fs.copyFileSync(CONFIG_FILE, currentBackupFile);
        logger.info(`Current config backed up to ${currentBackupFile}`);
        console.log(`ℹ Current config backed up to ${currentBackupFile}`);

        writeEnvFile(CONFIG_FILE, backupConfig);

        logger.info(`Config restored from backup: ${backupFile}`);
        console.log(chalk.green(`✅ Config restored from ${path.basename(backupFile)}`));
        console.log('ℹ Restart tenant-agent to apply changes');
    });
