"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorCommand = void 0;
const commander_1 = require("commander");
const run_doctor_1 = require("./run-doctor");
exports.doctorCommand = new commander_1.Command('doctor')
    .description('Run system checks for agentctl')
    .action(async () => {
    await (0, run_doctor_1.runDoctor)();
});
//# sourceMappingURL=index.js.map