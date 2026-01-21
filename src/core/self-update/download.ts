import fs from 'fs';
import path from 'path';
import { getReleaseAsset } from '../../services/github/assets';
import axios from 'axios';

export async function downloadBinary(version: string, destFolder: string): Promise<string> {
    const assetUrl = await getReleaseAsset(version, 'agentctl.exe');
    const filePath = path.join(destFolder, 'agentctl.exe');

    const writer = fs.createWriteStream(filePath);
    const response = await axios.get(assetUrl, { responseType: 'stream' });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
    });
}
