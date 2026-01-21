import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { ensureAdmin } from '../../utils/admin';
import { fileExists } from '../../utils/fs';
import logger from '../../utils/logger';

const CONFIG_FILE = path.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');

export const configBackup = new Command('backup')
    .description('Backup current config file')
    .action(() => {
        ensureAdmin();

        if (!fileExists(CONFIG_FILE)) {
            console.error('❌ Config file not found');
            process.exit(1);
        }

        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `${CONFIG_FILE}.bak.${ts}`;

        fs.copyFileSync(CONFIG_FILE, backupFile);
        logger.info(`Config backup created: ${backupFile}`);

        console.log(`✅ Backup created: ${backupFile}`);
    });
