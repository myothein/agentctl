import { CheckResult } from './checks/windows';
import { ICONS } from '../output/icons';

export function render(results: CheckResult[]): void {
    console.log('\nAgent Doctor Report');
    console.log('==================\n');

    results.forEach(r => {
        const icon = r.ok ? ICONS.SUCCESS : ICONS.ERROR;
        console.log(`${icon} ${r.name}: ${r.message}`);
    });

    const allOk = results.every(r => r.ok);
    console.log(`\nSummary: ${allOk ? ICONS.SUCCESS + ' All checks passed!' : ICONS.WARNING + ' Some checks failed'}`);
}
