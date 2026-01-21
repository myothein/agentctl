"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommandRegistry = getCommandRegistry;
// Import all agentctl commands individually
const install_1 = require("../commands/agent/install");
const uninstall_1 = require("../commands/agent/uninstall");
const start_1 = require("../commands/agent/start");
const stop_1 = require("../commands/agent/stop");
const restart_1 = require("../commands/agent/restart");
const status_1 = require("../commands/agent/status");
const update_1 = require("../commands/agent/update");
const logs_1 = require("../commands/agent/logs");
//import { config } from '../commands/agent/config';
const version_1 = require("../commands/agent/version");
const doctor_1 = require("../doctor");
// Config commands
const config_1 = require("../commands/config");
// outbox commands
const outbox_1 = require("../commands/outbox");
/**
 * Returns all commands for agentctl CLI
 */
function getCommandRegistry() {
    return [
        install_1.install,
        uninstall_1.uninstall,
        start_1.start,
        stop_1.stop,
        restart_1.restart,
        status_1.status,
        update_1.update,
        logs_1.logs,
        // Feature domains
        config_1.config,
        outbox_1.outbox,
        version_1.version,
        doctor_1.doctorCommand,
    ];
}
//# sourceMappingURL=command-registry.js.map