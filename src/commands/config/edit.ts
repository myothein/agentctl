import { Command } from 'commander';
import path from 'path';
import { ensureAdmin } from '../../utils/admin';
import { runCommand } from '../../utils/exec';
import { fileExists, writeFile } from '../../utils/fs';

const CONFIG_FILE = path.join('C:', 'ProgramData', 'TenantAgent', 'config', 'agent.env');

export const configEdit = new Command('edit')
    .description('Edit config file in Notepad')
    .action(async () => {
        ensureAdmin();

        if (!fileExists(CONFIG_FILE)) {
            writeFile(CONFIG_FILE, '');
        }

        await runCommand('notepad.exe', [CONFIG_FILE]);
    });
