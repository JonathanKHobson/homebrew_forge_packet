import { parse } from 'csv-parse/sync';

export type CsvRow = Record<string, string>;

export function parseCsvRecords(content: string): CsvRow[] {
  const rows = parse(content, {
    bom: true,
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true
  }) as CsvRow[];

  return rows.map((row) => {
    const normalized: CsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = typeof value === 'string' ? value.replace(/\\n/g, '\n') : String(value ?? '');
    }
    return normalized;
  });
}

export function writeCsvRecords(rows: CsvRow[], headers: string[]): string {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? '')).join(','))
  ];
  return lines.join('\n');
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

