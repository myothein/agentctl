import fs from 'fs';
import path from 'path';
import { getLatestVersion } from './latest-version';
import { BIN_DIR } from '../constants/paths';

export async function checkUpdate(): Promise<{ version: string; filePath: string } | null> {
    const latest = await getLatestVersion();

    const versionFile = path.join(BIN_DIR, 'VERSION');
    let currentVersion = '0.0.0';

    if (fs.existsSync(versionFile)) {
        currentVersion = fs.readFileSync(versionFile, 'utf8').trim();
    }

    if (latest.version !== currentVersion) {
        return {
            version: latest.version,
            filePath: latest.filePath,
        };
    }

    return null;
}
