import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

const CONFIG_DIR = path.join('C:', 'ProgramData', 'TenantAgent', 'config');

export const configListBackups = new Command('list-backups')
    .description('List all config backups')
    .action(() => {
        if (!fs.existsSync(CONFIG_DIR)) {
            console.log('⚠ No config directory found');
            return;
        }

        const backups = fs.readdirSync(CONFIG_DIR)
            .filter(f => f.startsWith('agent.env.bak.'))
            .sort();

        if (!backups.length) {
            console.log('⚠ No backups found');
            return;
        }

        console.log(chalk.blue('Available backups:'));
        backups.forEach(b => console.log(` - ${b}`));
    });
