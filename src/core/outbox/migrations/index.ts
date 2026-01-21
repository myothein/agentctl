import type { SQLiteDB } from '../../db/sqlite.js';
import type { Migration } from './types.js';
import { v1Init } from './v1_init.js';

export const migrations: Migration[] = [v1Init].sort(
    (a, b) => a.version - b.version
);

export const latestVersion = migrations[migrations.length - 1].version;

export function runMigrations(db: SQLiteDB, currentVersion: number, dryRun = false) {
    const pending = migrations.filter(m => m.version > currentVersion);
    for (const migration of pending) {
        console.log(`➡️ ${dryRun ? '[DRY]' : ''} v${migration.version} ${migration.name}`);
        if (!dryRun) db.transaction(() => migration.up(db))();
        else if (migration.dryRun) migration.dryRun(db);
    }
}
