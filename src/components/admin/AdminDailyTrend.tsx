"use client";

import { formatGhs } from "@/lib/format-money";

export type DailyTrendRow = {
  date: string;
  revenueCents: number;
  completedOrderCount: number;
  expensesCents: number;
};

/**
 * Scrollable column chart: completed revenue (solid) vs logged expenses (bordered) per day.
 */
export function AdminDailyTrend({ days }: { days: DailyTrendRow[] }) {
  if (days.length === 0) return null;

  const max = Math.max(
    ...days.map((d) => Math.max(d.revenueCents, d.expensesCents)),
    1
  );
  const barMaxPx = 112;

  return (
    <div className="admin-card" style={{ overflowX: "auto", paddingBottom: "0.5rem" }}>
      <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
        <strong>Daily trend</strong> — completed order revenue (filled) and expenses logged that day (outline).
        Day boundaries follow the configured business timezone (default Africa/Accra).
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          minHeight: 140,
          paddingTop: "0.5rem",
          minWidth: Math.min(days.length * 10, 800),
        }}
      >
        {days.map((d) => {
          const revH = Math.max(0, Math.round((d.revenueCents / max) * barMaxPx));
          const expH = Math.max(0, Math.round((d.expensesCents / max) * barMaxPx));
          const tip = `${d.date}\nRevenue: ${formatGhs(d.revenueCents)} (${d.completedOrderCount} orders)\nExpenses: ${formatGhs(d.expensesCents)}`;
          return (
            <div
              key={d.date}
              title={tip}
              style={{
                flex: "1 0 6px",
                minWidth: 5,
                maxWidth: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 2,
                  height: barMaxPx,
                }}
              >
                <div
                  style={{
                    width: "42%",
                    height: revH || (d.revenueCents > 0 ? 3 : 0),
                    minHeight: d.revenueCents > 0 && revH === 0 ? 3 : 0,
                    background: "color-mix(in srgb, var(--foreground) 75%, transparent)",
                    borderRadius: 2,
                  }}
                />
                <div
                  style={{
                    width: "42%",
                    height: expH || (d.expensesCents > 0 ? 3 : 0),
                    minHeight: d.expensesCents > 0 && expH === 0 ? 3 : 0,
                    border: "2px solid color-mix(in srgb, var(--muted) 80%, transparent)",
                    borderRadius: 2,
                    boxSizing: "border-box",
                    background: "transparent",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: days.length > 21 ? "0.55rem" : "0.65rem",
                  color: "var(--muted)",
                  lineHeight: 1,
                }}
              >
                {days.length > 14 ? d.date.slice(8) : d.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
