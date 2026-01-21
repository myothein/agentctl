export function printTable(headers: string[], rows: (string | number)[][]): void {
    const colWidths = headers.map((h, i) => {
        return Math.max(
            h.length,
            ...rows.map(row => String(row[i]).length)
        );
    });

    const rowStr = (row: (string | number)[]) =>
        row
            .map((cell, i) => String(cell).padEnd(colWidths[i]))
            .join('  ');

    console.log(rowStr(headers));
    console.log(colWidths.map(w => '-'.repeat(w)).join('  '));

    rows.forEach(row => console.log(rowStr(row)));
}
