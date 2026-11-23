# Windows Service Release Safety — agentctl

**Production NO-GO.** This branch adds a fail-closed Windows Service registration procedure and tests on GitHub Windows runners, but does not install, stop or remove real Windows services in CI.

- New `agentctl agent install` preflights all files and configuration before calling NSSM. It refuses to replace, stop or remove a service that already exists.
- Newly registered services default to `SERVICE_DEMAND_START`, not autostart, because runtime credential injection, ACL controls and real host acceptance are not verified.
- If a post-registration configuration step fails, only the newly created service is removed. A rollback failure is explicitly reported for operator attention.
- Dangerous existing `update`, `applyUpdate` and `uninstall` paths are blocked rather than silently stopping services, overwriting binaries or deleting `C:\ProgramData\TenantAgent` and SQLite backups.
- SHA-256 verification now fails closed when the expected checksum is missing or invalid. Cryptographic signature verification is STILL required before production update support.
- Unit tests inject fake NSSM responses on Linux/Windows runners. **They do not prove real NSSM/SCM installation, Windows service start, rollback, or data restore.** A dedicated isolated Windows VM/PC test and independent backup/restore acceptance remain required.
- Never import or expose production credentials via GitHub Actions. No UIMS integration is authorized here.
