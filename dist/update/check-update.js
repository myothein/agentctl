"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUpdate = checkUpdate;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const latest_version_1 = require("./latest-version");
const paths_1 = require("../constants/paths");
async function checkUpdate() {
    const latest = await (0, latest_version_1.getLatestVersion)();
    const versionFile = path_1.default.join(paths_1.BIN_DIR, 'VERSION');
    let currentVersion = '0.0.0';
    if (fs_1.default.existsSync(versionFile)) {
        currentVersion = fs_1.default.readFileSync(versionFile, 'utf8').trim();
    }
    if (latest.version !== currentVersion) {
        return {
            version: latest.version,
            filePath: latest.filePath,
        };
    }
    return null;
}
//# sourceMappingURL=check-update.js.map