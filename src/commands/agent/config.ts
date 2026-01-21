import { Command } from 'commander';
import { loadConfig } from '../../config/load-config';
import { writeFile } from '../../utils/fs';
import { CONFIG_DIR } from '../../constants/paths';
import path from 'path';
import logger from '../../utils/logger';

export const config = new Command('config')
    .description('Manage agent configuration');

config
    .command('set <keyValue>')
    .description('Set a configuration key (format: key=value)')
    .action((keyValue: string) => {
            try {
                    // Parse key=value
                    const [key, value] = keyValue.split('=');
                    if (!key || value === undefined) {
                            throw new Error('Invalid format. Use key=value');
                    }

                    // Load existing config
                    const config = loadConfig();
                    config[key] = isNaN(Number(value)) ? value : Number(value);

                    // Write to agent.env in EXE-safe config directory
                    const configFile = path.join(CONFIG_DIR, 'agent.env');
                    const lines = Object.entries(config).map(([k, v]) => `${k}=${v}`);
                    writeFile(configFile, lines.join('\n'));

                    console.log(`✅ Config updated: ${key}=${value}`);
                    logger.info(`Config updated: ${key}=${value}`);
            } catch (err: unknown) {
                    console.error('❌ Failed to update config:', err instanceof Error ? err.message : err);
                    if (err instanceof Error) logger.error(err.stack || err.message);
            }
    });
