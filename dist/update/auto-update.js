"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoUpdate = autoUpdate;
const check_update_1 = require("./check-update");
const apply_1 = require("./apply");
async function autoUpdate() {
    const updateAvailable = await (0, check_update_1.checkUpdate)();
    if (updateAvailable) {
        console.log('Update available. Applying...');
        await (0, apply_1.applyUpdate)(updateAvailable.filePath);
        console.log('✅ Update applied successfully');
    }
    else {
        console.log('No updates available.');
    }
}
//# sourceMappingURL=auto-update.js.map