"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDoctor = runDoctor;
const windows_1 = require("./checks/windows");
const render_1 = require("./render");
async function runDoctor() {
    const results = await (0, windows_1.windowsChecks)();
    (0, render_1.render)(results);
}
//# sourceMappingURL=run-doctor.js.map