# Signed Update Safety — DEV/QA

**Status: PRODUCTION NO-GO.** Draft PR only. All automatic/in-place service and CLI updates remain disabled; no production changes are enabled.

## Signature protocol

- Manifest JSON: `{"schemaVersion":1,"version":"2.0.0","sha256":"<64 hex characters>","signature":"<canonical base64 Ed25519 signature>"}`.
- The signed UTF-8 bytes are `tenant-agent-update/v1\n<version>\n<lowercase-sha256>\n` (literal line feeds).
- The binary must match the SHA-256 exactly and have a valid Ed25519 signature from an **independently provisioned and approved** public key. The private signer key must NEVER be committed, uploaded to GitHub, or generated as a production secret in CI. CI test keys are ephemeral.
- `agentctl update --verify-only C:\\staging\\tenant-agent.exe --manifest C:\\staging\\manifest.json --trusted-key C:\\approved-root\\update-key.pem` verifies a *local candidate* with NO installation, SCM stop, service restart or other machine mutation. Supplying arbitrary public keys defeats trust; operators must verify and protect the approved local trust root separately.

## Staged transaction implementation

`runStagedSignedUpdate` is currently a **testable orchestration primitive**, not connected to Windows SCM or the CLI. It requires explicit approval, verifies signature and SHA-256 before any service activity, checks service state, snapshots the existing binary to a separately verified backup, only then stops the service, replaces, starts and checks health. Any post-stop failure attempts restoration of the verified backup and checks restored health; failure reports manual recovery required.

**Not yet proven:** Real NSSM/SCM state transitions and timeouts, file locks, atomic file replacement, signer key custody/rotation and rollback under reboot/power failure, storage ACLs, hardware-backed identity, outbox recovery and deployment approval. Do not connect staged operations to a real machine until sandbox Windows acceptance gates pass.

Legacy PowerShell self-replacement, legacy `process.execPath` backup and unsafe uninstall are disabled. Tenant data and ProgramData must not be deleted by an update. History/secret exposure remediation and reviewed backups remain mandatory.
