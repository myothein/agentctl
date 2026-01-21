import { Command } from 'commander';
import { checkVersionAndUpdate } from '../../core/self-update/index';
import { promptConfirm } from './prompt';
import { printSuccess, printInfo, printError } from './output';
import { parseFlags } from './flags';

export const agentctlUpdate = new Command('update')
    .description('Update agentctl CLI to the latest version')
    .option('--check', 'Check for latest version without updating')
    .option('--yes', 'Automatically confirm update')
    .action(async (options) => {
        try {
            const flags = parseFlags(options);

            const proceed = flags.yes || await promptConfirm('Proceed with update?');
            if (!proceed) {
                printInfo('Update cancelled by user.');
                return;
            }

            const result = await checkVersionAndUpdate(flags);

            if (result.updated) {
                printSuccess(`agentctl updated to version ${result.version}`);
            } else {
                printInfo('agentctl is already up to date.');
            }
        } catch (err: any) {
            printError(`Update failed: ${err.message}`);
        }
    });
