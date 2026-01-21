"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestVersion = exports.migrations = void 0;
exports.runMigrations = runMigrations;
const v1_init_js_1 = require("./v1_init.js");
exports.migrations = [v1_init_js_1.v1Init].sort((a, b) => a.version - b.version);
exports.latestVersion = exports.migrations[exports.migrations.length - 1].version;
function runMigrations(db, currentVersion, dryRun = false) {
    const pending = exports.migrations.filter(m => m.version > currentVersion);
    for (const migration of pending) {
        console.log(`➡️ ${dryRun ? '[DRY]' : ''} v${migration.version} ${migration.name}`);
        if (!dryRun)
            db.transaction(() => migration.up(db))();
        else if (migration.dryRun)
            migration.dryRun(db);
    }
}
//# sourceMappingURL=index.js.map