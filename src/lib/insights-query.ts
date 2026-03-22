/** Max period length for insights APIs (days). */
export const MAX_INSIGHTS_PERIOD_DAYS = 365;

/** Clamp `days` query param to [1, MAX_INSIGHTS_PERIOD_DAYS]. */
export function clampInsightsDaysParam(value: string | null): number {
  const n = parseInt(value ?? "30", 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(MAX_INSIGHTS_PERIOD_DAYS, Math.max(1, n));
}
