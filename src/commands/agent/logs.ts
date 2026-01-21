import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { AGENT_LOG_DIR } from '../../constants/paths';
import logger from '../../utils/logger';

/**
 * Get the latest log file in a directory
 */
function getLatestLogFile(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.log'))
        .map(f => ({ file: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);
    return files.length ? path.join(dir, files[0].file) : null;
}

/**
 * Read last n lines of a file
 */
function readLastLines(file: string, n: number = 100): string {
    const content = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
    return content.slice(-n).join('\n');
}

export const logs = new Command('logs')
    .description('Show last 100 lines of tenant-agent logs')
    .action(() => {
        try {
            const logFile = getLatestLogFile(AGENT_LOG_DIR);
            if (!logFile) {
                console.log('No logs found');
                logger.info('No tenant-agent logs found to display');
                return;
            }

            console.log(`Showing last 100 lines of ${path.basename(logFile)}:\n`);
            const output = readLastLines(logFile, 100);
            console.log(output);
            logger.info(`Displayed last 100 lines of ${path.basename(logFile)}`);
        } catch (err: unknown) {
            console.error('❌ Failed to read logs:', err instanceof Error ? err.message : err);
            if (err instanceof Error) logger.error(err.stack || err.message);
        }
    });
