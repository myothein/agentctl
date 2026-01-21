import { getLatestRelease } from './releases';

export async function getReleaseAsset(version: string, assetName: string): Promise<string> {
    const release = await getLatestRelease();

    if (release.version !== version) {
        throw new Error(`Release version ${version} not found.`);
    }

    if (assetName === 'agentctl.exe') return release.assetUrl;
    if (assetName === 'checksum') return release.checksum || '';

    throw new Error(`Asset ${assetName} not found in release ${version}`);
}
