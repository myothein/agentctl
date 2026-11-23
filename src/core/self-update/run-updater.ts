/** Legacy PowerShell in-place executable replacement is permanently blocked here. */
export async function runUpdater(_newBinaryPath:string):Promise<void> {
    throw new Error('Unsafe legacy self-update blocked; signed release verification required');
}
