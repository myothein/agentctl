import readline from 'readline';

/**
 * Prompt the user to confirm a destructive action.
 * Returns true if user types the exact confirmation text.
 *
 * @param message The prompt message, e.g. "Type RESTORE to continue"
 * @param confirmText The text user must type (default: "RESTORE")
 * @returns Promise<boolean>
 */
export async function promptConfirm(
    message: string,
    confirmText: string = 'RESTORE'
): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`${message}: `, (answer) => {
            rl.close();
            if (answer.trim().toUpperCase() === confirmText.toUpperCase()) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}
