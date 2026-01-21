"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isServiceRunning = isServiceRunning;
exports.startService = startService;
exports.stopService = stopService;
exports.restartService = restartService;
exports.stopServiceIfRunning = stopServiceIfRunning;
const child_process_1 = require("child_process");
const service_js_1 = require("../../constants/service.js");
const admin_js_1 = require("../../core/system/admin.js");
/**
 * Check if tenant-agent service is running
 */
function isServiceRunning() {
    try {
        const output = (0, child_process_1.execSync)(`sc query "${service_js_1.SERVICE_NAME}"`, { encoding: 'utf-8' });
        return output.includes('RUNNING');
    }
    catch {
        return false;
    }
}
/**
 * Start the tenant-agent service
 */
function startService() {
    (0, admin_js_1.ensureAdmin)();
    if (isServiceRunning()) {
        console.log(`✅ Service "${service_js_1.SERVICE_NAME}" is already running`);
        return;
    }
    try {
        (0, child_process_1.execSync)(`sc start "${service_js_1.SERVICE_NAME}"`, { stdio: 'inherit' });
        console.log(`✅ Service "${service_js_1.SERVICE_NAME}" started`);
    }
    catch (err) {
        console.error(`❌ Failed to start service: ${err.message || err}`);
        throw err;
    }
}
/**
 * Stop the tenant-agent service
 */
function stopService() {
    (0, admin_js_1.ensureAdmin)();
    if (!isServiceRunning()) {
        console.log(`✅ Service "${service_js_1.SERVICE_NAME}" is not running`);
        return;
    }
    try {
        (0, child_process_1.execSync)(`sc stop "${service_js_1.SERVICE_NAME}"`, { stdio: 'inherit' });
        console.log(`✅ Service "${service_js_1.SERVICE_NAME}" stopped`);
    }
    catch (err) {
        console.error(`❌ Failed to stop service: ${err.message || err}`);
        throw err;
    }
}
/**
 * Restart the tenant-agent service
 */
function restartService() {
    (0, admin_js_1.ensureAdmin)();
    stopService();
    startService();
}
/**
 * Stop service if running (used for backup/restore)
 */
function stopServiceIfRunning() {
    if (isServiceRunning())
        stopService();
}
//# sourceMappingURL=service-manager.js.map