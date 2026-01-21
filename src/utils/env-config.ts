import fs from 'fs';

export function readEnvFile(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) return {};

    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    const result: Record<string, string> = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key, ...rest] = trimmed.split('=');
        result[key] = rest.join('=');
    }

    return result;
}

export function writeEnvFile(filePath: string, data: Record<string, string>) {
    const content = Object.entries(data)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

    fs.writeFileSync(filePath, content + '\n');
}
