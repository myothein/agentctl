"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = render;
const icons_1 = require("../output/icons");
function render(results) {
    console.log('\nAgent Doctor Report');
    console.log('==================\n');
    results.forEach(r => {
        const icon = r.ok ? icons_1.ICONS.SUCCESS : icons_1.ICONS.ERROR;
        console.log(`${icon} ${r.name}: ${r.message}`);
    });
    const allOk = results.every(r => r.ok);
    console.log(`\nSummary: ${allOk ? icons_1.ICONS.SUCCESS + ' All checks passed!' : icons_1.ICONS.WARNING + ' Some checks failed'}`);
}
//# sourceMappingURL=render.js.map