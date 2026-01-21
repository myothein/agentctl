import path from 'path';
import fs from 'fs';
import logger from './logger';

const CONFIG_FILE = path.join('C:', 'Program Files', 'TenantAgent', 'config', 'agent.env');

export function backupConfig(): string {
    if (!fs.existsSync(CONFIG_FILE)) {
        logger.warn('Config file does not exist, skipping backup.');
        return '';
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${CONFIG_FILE}.bak.${ts}`;

    fs.copyFileSync(CONFIG_FILE, backupFile);
    logger.info(`Config backup created: ${backupFile}`);

    return backupFile;
}
