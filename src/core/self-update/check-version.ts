import { getLatestRelease } from '../../services/github/releases';
import { ReleaseInfo } from './types';

export async function checkVersion(): Promise<string> {
    const release: ReleaseInfo = await getLatestRelease();

    if (!release || !release.version) {
        throw new Error('Unable to fetch latest version info from GitHub.');
    }

    return release.version;
}
