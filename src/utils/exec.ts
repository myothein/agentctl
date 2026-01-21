import { execFile } from 'child_process';
import logger from './logger';

export interface ExecResult {
    code: number;
    stdout: string;
    stderr: string;
}

/**
 * Run an external command safely (EXE-safe).
 * @param command Path to executable or command name
 * @param args Arguments array
 * @param options.silent Suppress console logging
 * @returns Promise<ExecResult>
 */
export function runCommand(
    command: string,
    args: string[] = [],
    options: { silent?: boolean } = {}
): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
        const fullCommand = `${command} ${args.join(' ')}`;
        if (!options.silent) {
            console.log(`> Running: ${fullCommand}`);
            logger.info(`Running command: ${fullCommand}`);
        }

        // Execute the file
        execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
            const result: ExecResult = {
                code: 0,
                stdout: stdout.toString(),
                stderr: stderr.toString(),
            };

            if (error) {
                // If it's an ExecException with code, return code
                result.code = typeof (error as any).code === 'number' ? (error as any).code : 1;
                if (!options.silent) {
                    console.error(`❌ Command failed: ${fullCommand}`);
                    console.error(stderr.toString());
                }
                logger.error(`Command failed: ${fullCommand}, stderr: ${stderr}`);
            } else {
                if (!options.silent) {
                    console.log(stdout.toString());
                }
                logger.info(`Command succeeded: ${fullCommand}`);
            }

            resolve(result);
        });
    });
}
