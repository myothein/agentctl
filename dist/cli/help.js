"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showHelp = showHelp;
function showHelp() {
    console.log(`
Tenant Agent CLI
================
Usage:
  agentctl <command> [options]

Commands:
  install         Install tenant-agent service
  uninstall       Remove tenant-agent service
  start           Start tenant-agent service
  stop            Stop tenant-agent service
  restart         Restart tenant-agent service
  status          Show service status
  update          Update tenant-agent binary
  logs            Show agent logs
  config set      Update configuration
  version         Show agentctl & tenant-agent versions
  doctor          Run system checks

Options:
  -h, --help      Display help for command
  -V, --version   Display agentctl version

Examples:
  agentctl install
  agentctl start
  agentctl config set AGENT_PORT=5000
  agentctl logs
`);
}
//# sourceMappingURL=help.js.map