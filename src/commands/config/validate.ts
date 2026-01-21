import { Command } from 'commander';
import path from 'path';
import { readEnvFile } from '../../utils/env-config';

const CONFIG_FILE = path.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');

const REQUIRED_KEYS = ['TENANT_ID', 'AGENT_PORT', 'LOG_LEVEL'];

export const configValidate = new Command('validate')
    .description('Validate configuration file')
    .action(() => {
        const config = readEnvFile(CONFIG_FILE);
        let valid = true;

        for (const key of REQUIRED_KEYS) {
            if (!config[key]) {
                console.error(`❌ Missing required key: ${key}`);
                valid = false;
            }
        }

        if (config.AGENT_PORT && isNaN(Number(config.AGENT_PORT))) {
            console.error('❌ AGENT_PORT must be a number');
            valid = false;
        }

        if (valid) {
            console.log('✅ Configuration is valid');
        } else {
            process.exit(1);
        }
    });
