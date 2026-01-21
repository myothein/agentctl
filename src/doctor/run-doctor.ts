import { windowsChecks } from './checks/windows';
import { render } from './render';

export async function runDoctor(): Promise<void> {
    const results = await windowsChecks();
    render(results);
}
