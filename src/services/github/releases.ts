import axios from 'axios';
import { ReleaseInfo } from '../../core/self-update/types';

const GITHUB_OWNER = 'myothein';      // replace with your GitHub org/user
const GITHUB_REPO = 'agentctl';       // replace with your repo
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export async function getLatestRelease(): Promise<ReleaseInfo> {
    try {
        const res = await axios.get(GITHUB_API, {
            headers: { 'Accept': 'application/vnd.github.v3+json' },
        });

        const data = res.data;

        // Find .exe asset
        const exeAsset = data.assets.find((a: any) => a.name === 'agentctl.exe');
        const checksumAsset = data.assets.find((a: any) => a.name === 'agentctl.exe.sha256');

        if (!exeAsset) {
            throw new Error('agentctl.exe asset not found in latest release.');
        }

        return {
            version: data.tag_name,
            assetUrl: exeAsset.browser_download_url,
            checksum: checksumAsset?.browser_download_url,
        };
    } catch (err: any) {
        throw new Error(`Failed to fetch latest release from GitHub: ${err.message}`);
    }
}
