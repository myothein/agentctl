"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestVersion = getLatestVersion;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
async function getLatestVersion() {
    /**
     * In real implementation:
     * - fetch version info from HTTP API
     * - download binary to temp folder
     */
    const tempDir = os_1.default.tmpdir();
    const downloadedBinary = path_1.default.join(tempDir, 'tenant-agent.exe');
    return {
        version: '1.0.1',
        filePath: downloadedBinary,
    };
}
//# sourceMappingURL=latest-version.js.map