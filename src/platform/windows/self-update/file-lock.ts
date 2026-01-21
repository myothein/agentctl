import fs from 'fs';
import { promisify } from 'util';
const sleep = promisify(setTimeout);

/**
 * Wait until file is unlocked or timeout (default 5s)
 */
export async function waitForUnlock(filePath: string, timeout = 5000): Promise<void> {
    const interval = 100;
    let waited = 0;

    while (waited < timeout) {
        try {
            fs.accessSync(filePath, fs.constants.W_OK);
            return; // file is writable
        } catch {
            await sleep(interval);
            waited += interval;
        }
    }

    throw new Error(`File ${filePath} is locked and cannot be updated.`);
}
