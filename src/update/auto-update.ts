import { checkUpdate } from './check-update';
import { applyUpdate } from './apply';

export async function autoUpdate(): Promise<void> {
    const updateAvailable = await checkUpdate();
    if (updateAvailable) {
        console.log('Update available. Applying...');
        await applyUpdate(updateAvailable.filePath);
        console.log('✅ Update applied successfully');
    } else {
        console.log('No updates available.');
    }
}
