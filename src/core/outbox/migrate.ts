import fs from 'fs';
import Database from 'better-sqlite3';
import type { SQLiteDB } from '../db/sqlite.js';
import { ensureAdmin } from '../system/admin.js';
import { stopServiceIfRunning, startService } from '../agent/service-manager.js';
import { runMigrations, latestVersion } from './migrations/index.js';
import { getDbVersion, setDbVersion } from './version.js';
import { OUTBOX_DB, OUTBOX_BACKUP_DIR } from './paths.js';

function backupOutbox(dbPath: string): string {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = OUTBOX_BACKUP_DIR + `/outbox.db.backup.${ts}.db`;

    if (!fs.existsSync(OUTBOX_BACKUP_DIR)) fs.mkdirSync(OUTBOX_BACKUP_DIR, { recursive: true });

    fs.copyFileSync(dbPath, backupPath);

    // Copy WAL/SHM files if they exist
    for (const ext of ['-wal', '-shm']) {
        const file = dbPath + ext;
        if (fs.existsSync(file)) fs.copyFileSync(file, backupPath + ext);
    }

    return backupPath;
}

export interface MigrateOutboxOptions { dryRun?: boolean }

export async function migrateOutbox(options: MigrateOutboxOptions = {}): Promise<void> {
    ensureAdmin();

    const dbPath = OUTBOX_DB;
    if (!fs.existsSync(dbPath)) throw new Error(`outbox.db not found at ${dbPath}`);

    stopServiceIfRunning();

    let db: SQLiteDB | null = null;

    try {
        db = new Database(dbPath);

        const currentVersion = getDbVersion(db);
        if (currentVersion === latestVersion) {
            console.log('✅ Outbox database is already up to date');
            return;
        }

        console.log(`🔄 Migrating outbox.db from v${currentVersion} → v${latestVersion}`);

        if (options.dryRun) {
            console.log('📝 Dry run – no changes will be applied');
            runMigrations(db, currentVersion, true);
            return;
        }

        const backupPath = backupOutbox(dbPath);
        console.log(`📦 Backup created: ${backupPath}`);

        runMigrations(db, currentVersion, false);
        setDbVersion(db, latestVersion);

        console.log('✅ Outbox migration completed successfully');
    } finally {
        try { db?.close(); } catch {}
        startService();
    }
}
