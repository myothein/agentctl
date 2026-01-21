import { Command } from 'commander';
import path from 'path';
import { readEnvFile } from '../../utils/env-config';

const CONFIG_FILE = path.join(
    'C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env'
);

export const configList = new Command('list')
    .description('List all config values')
    .action(() => {
        const config = readEnvFile(CONFIG_FILE);

        if (Object.keys(config).length === 0) {
            console.log('⚠ No config values found');
            return;
        }

        for (const [key, value] of Object.entries(config)) {
            console.log(`${key}=${value}`);
        }
    });
