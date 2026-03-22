/** Human-readable prior-period delta, e.g. "+12%" or "—" if no baseline. */
export function formatPctDelta(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}
