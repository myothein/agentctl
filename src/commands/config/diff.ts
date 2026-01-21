import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { readEnvFile } from '../../utils/env-config';

const CONFIG_DIR = path.join('C:', 'ProgramData', 'TenantAgent', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'agent.env');

function findLatestBackup(): string | null {
    const files = fs.readdirSync(CONFIG_DIR)
        .filter(f => f.startsWith('agent.env.bak.'))
        .sort()
        .reverse();

    return files.length ? path.join(CONFIG_DIR, files[0]) : null;
}

export const configDiff = new Command('diff')
    .description('Show config changes since last backup')
    .action(() => {
        const backup = findLatestBackup();

        if (!backup) {
            console.log('⚠ No backup found');
            return;
        }

        const current = readEnvFile(CONFIG_FILE);
        const old = readEnvFile(backup);

        for (const key of new Set([...Object.keys(current), ...Object.keys(old)])) {
            if (!(key in old)) {
                console.log(`+ ${key}=${current[key]}`);
            } else if (!(key in current)) {
                console.log(`- ${key}`);
            } else if (current[key] !== old[key]) {
                console.log(`~ ${key}: ${old[key]} → ${current[key]}`);
            }
        }
    });
