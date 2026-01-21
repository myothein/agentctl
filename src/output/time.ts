export function formatTime(date: Date = new Date()): string {
    return date.toISOString().replace('T', ' ').split('.')[0]; // e.g., 2026-01-15 11:42:00
}

export function formatDuration(ms: number): string {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / 60000) % 60;
    const hr = Math.floor(ms / 3600000);

    return `${hr}h ${min}m ${sec}s`;
}
