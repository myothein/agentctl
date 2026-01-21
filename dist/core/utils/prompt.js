"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptConfirm = promptConfirm;
const readline_1 = __importDefault(require("readline"));
/**
 * Prompt the user to confirm a destructive action.
 * Returns true if user types the exact confirmation text.
 *
 * @param message The prompt message, e.g. "Type RESTORE to continue"
 * @param confirmText The text user must type (default: "RESTORE")
 * @returns Promise<boolean>
 */
async function promptConfirm(message, confirmText = 'RESTORE') {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(`${message}: `, (answer) => {
            rl.close();
            if (answer.trim().toUpperCase() === confirmText.toUpperCase()) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    });
}
//# sourceMappingURL=prompt.js.map