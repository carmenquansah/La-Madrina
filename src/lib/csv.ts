export function csvCell(v: string | number | boolean | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}
