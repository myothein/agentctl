import { Command } from 'commander';
import { runDoctor } from './run-doctor';

export const doctorCommand = new Command('doctor')
    .description('Run system checks for agentctl')
    .action(async () => {
        await runDoctor();
    });
