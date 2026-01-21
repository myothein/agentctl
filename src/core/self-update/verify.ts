import crypto from 'crypto';
import fs from 'fs';
import axios from 'axios';
import { getReleaseAsset } from '../../services/github/assets';

/**
 * Verify SHA256 checksum of downloaded agentctl binary
 * @param filePath Local path to downloaded agentctl.exe
 * @param version GitHub release version
 */
export async function verifyBinary(filePath: string, version: string): Promise<void> {
    // 1️⃣ Fetch checksum URL for this release
    const checksumUrl = await getReleaseAsset(version, 'checksum'); // returns URL to checksum file
    if (!checksumUrl) {
        console.warn('⚠️  No checksum provided for this release, skipping verification.');
        return;
    }

    // 2️⃣ Download checksum content
    const res = await axios.get(checksumUrl);
    const expectedChecksum = res.data.trim(); // should be hex string

    // 3️⃣ Compute SHA256 of downloaded file
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 4️⃣ Compare
    if (hash !== expectedChecksum) {
        throw new Error(
            `Downloaded binary checksum mismatch! Expected: ${expectedChecksum}, got: ${hash}`
        );
    }

    console.log('✔ Checksum verification passed.');
}
