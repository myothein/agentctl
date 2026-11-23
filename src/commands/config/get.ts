import { Command } from 'commander';
import path from 'path';
import { readEnvFile } from '../../utils/env-config';
import { safeConfigurationKey, safeConfigurationValue } from '../../utils/config-redaction';

const CONFIG_FILE = path.join(
    'C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env'
);

export const configGet = new Command('get')
    .argument('<key>', 'Config key')
    .description('Get a config value')
    .action((key) => {
        const config = readEnvFile(CONFIG_FILE);

        if (!(key in config)) {
            console.log('⚠ Not found');
            process.exit(1);
        }

        console.log(`${safeConfigurationKey(key)}=${safeConfigurationValue(key, config[key])}`);
    });
