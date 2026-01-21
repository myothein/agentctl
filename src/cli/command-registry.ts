import { Command } from 'commander';

// Import all agentctl commands individually
import { install } from '../commands/agent/install';
import { uninstall } from '../commands/agent/uninstall';
import { start } from '../commands/agent/start';
import { stop } from '../commands/agent/stop';
import { restart } from '../commands/agent/restart';
import { status } from '../commands/agent/status';
import { update } from '../commands/agent/update';
import { logs } from '../commands/agent/logs';
//import { config } from '../commands/agent/config';
import { version } from '../commands/agent/version';
import { doctorCommand } from '../doctor';

// Config commands
import { config } from '../commands/config';

// outbox commands
import { outbox } from '../commands/outbox';
/**
 * Returns all commands for agentctl CLI
 */
export function getCommandRegistry(): Command[] {
    return [
        install,
        uninstall,
        start,
        stop,
        restart,
        status,
        update,
        logs,

        // Feature domains
        config,
        outbox,

        version,
        doctorCommand,
    ];
}
