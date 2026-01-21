import { UpdateFlags, UpdateResult } from './types';
import { checkVersion } from './check-version';
import { prepareUpdate } from './prepare-update';
import { downloadBinary } from './download';
import { verifyBinary } from './verify';
import { runUpdater } from './run-updater';
import { rollback } from './rollback';

/**
 * Main function for agentctl self-update
 * @param flags CLI flags like --check and --yes
 */
export async function checkVersionAndUpdate(flags: UpdateFlags): Promise<UpdateResult> {
    try {
        // 1️⃣ Get latest release version
        const latestVersion = await checkVersion();
        const currentVersion = process.env.AGENTCTL_VERSION || '0.0.0';

        // 2️⃣ Already up-to-date?
        if (latestVersion === currentVersion) {
            return { updated: false, version: currentVersion };
        }

        // 3️⃣ Only check flag (--check)
        if (flags.check) {
            console.log(`Latest version available: ${latestVersion}`);
            return { updated: false, version: latestVersion };
        }

        // 4️⃣ Prepare staging folder & backup current binary
        const tempDir = await prepareUpdate(latestVersion);

        // 5️⃣ Download new binary
        const newBinary = await downloadBinary(latestVersion, tempDir);

        // 6️⃣ Verify downloaded binary checksum
        await verifyBinary(newBinary, latestVersion);

        // 7️⃣ Run platform-specific updater (Windows)
        await runUpdater(newBinary);

        // 8️⃣ Success
        return { updated: true, version: latestVersion };
    } catch (err: any) {
        console.error(`❌ Update failed: ${err.message}`);
        // 9️⃣ Rollback if anything goes wrong
        await rollback();
        throw err;
    }
}
