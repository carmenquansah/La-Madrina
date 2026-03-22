"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";
import type { AdminOverviewData } from "@/lib/admin-overview-types";
import { AdminDailyTrend } from "@/components/admin/AdminDailyTrend";
import { formatPctDelta } from "@/lib/format-delta";

type Overview = AdminOverviewData;

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch("/api/admin/insights/overview?days=30");
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || "Failed to load");
        setOverview(data.data);
      } catch {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="admin-page"><p>Loading…</p></div>;
  if (error) return <div className="admin-page"><p style={{ color: "#b91c1c" }}>{error}</p></div>;
  if (!overview) return null;

  const totalExpenses = overview.expensesByCategory.reduce((s, e) => s + e.amountCents, 0);
  const profitMarginPct = overview.revenueCents > 0
    ? Math.round((overview.grossProfitCents / overview.revenueCents) * 100)
    : 0;

  const ch = overview.comparison.changePct;

  return (
    <main className="admin-page">
      <h1>Dashboard</h1>
      <p className="page-desc">
        Last {overview.periodDays} days in <strong>{overview.businessTimeZone}</strong>. Revenue and AOV use{" "}
        <strong>completed</strong> orders only. Prior-period comparison uses the same length window immediately before.
      </p>

      {overview.alerts.length > 0 && (
        <div style={{ marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {overview.alerts.map((a) => (
            <div
              key={a.code}
              role="alert"
              className="admin-alert-box"
              style={{
                margin: 0,
                borderLeft: `4px solid ${a.level === "warning" ? "#b45309" : "var(--muted)"}`,
              }}
            >
              <strong>{a.level === "warning" ? "Warning" : "Notice"}:</strong> {a.message}
            </div>
          ))}
        </div>
      )}

      <section className="admin-section">
        <h2 className="admin-section-title">Key metrics</h2>
        <div className="admin-stat-grid">
          <div className="admin-stat">
            <div className="admin-stat-label">Revenue</div>
            <div className="admin-stat-value">{formatGhs(overview.revenueCents)}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              vs prior: {formatPctDelta(ch.revenueCents)}
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Orders (completed)</div>
            <div className="admin-stat-value">{overview.orderCount}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              vs prior: {formatPctDelta(ch.orderCount)}
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Average order value</div>
            <div className="admin-stat-value">{formatGhs(overview.averageOrderValueCents)}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              vs prior: {formatPctDelta(ch.averageOrderValueCents)}
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Total expenses</div>
            <div className="admin-stat-value">{formatGhs(overview.expensesCents)}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              vs prior: {formatPctDelta(ch.expensesCents)}
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Gross profit</div>
            <div className={`admin-stat-value ${overview.grossProfitCents >= 0 ? "positive" : "negative"}`}>
              {formatGhs(overview.grossProfitCents)}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              vs prior: {formatPctDelta(ch.grossProfitCents)}
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Profit margin %</div>
            <div className={`admin-stat-value ${profitMarginPct >= 0 ? "positive" : "negative"}`}>
              {profitMarginPct}%
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Open orders</div>
            <div className="admin-stat-value">{overview.openOrdersCount}</div>
            {overview.openOrdersCount > 0 && (
              <div style={{ marginTop: "0.35rem" }}>
                <Link href="/admin/orders?status=pending" style={{ fontSize: "0.85rem" }}>View pending →</Link>
              </div>
            )}
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Orders in period (all statuses)</div>
            <div className="admin-stat-value">{overview.totalOrdersInPeriod}</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Cancellation rate</div>
            <div className="admin-stat-value">{overview.cancellationRatePct}%</div>
            <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: "var(--muted)" }}>
              {overview.cancelledOrdersInPeriod} cancelled · vs prior: {formatPctDelta(ch.cancellationRatePct)}
            </div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Fixed expenses</div>
            <div className="admin-stat-value">{formatGhs(overview.fixedExpensesCents)}</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Variable expenses</div>
            <div className="admin-stat-value">{formatGhs(overview.variableExpensesCents)}</div>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Order funnel (period)</h2>
        <div className="admin-card">
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
            Orders <strong>created</strong> in the window: completion and cancel rates are shares of that total.
          </p>
          <div className="admin-stat-grid" style={{ maxWidth: "720px" }}>
            <div className="admin-stat">
              <div className="admin-stat-label">Created</div>
              <div className="admin-stat-value">{overview.orderFunnel.created}</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-label">Completed</div>
              <div className="admin-stat-value">{overview.orderFunnel.completed}</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-label">In progress</div>
              <div className="admin-stat-value">{overview.orderFunnel.inProgress}</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-label">Cancelled</div>
              <div className="admin-stat-value">{overview.orderFunnel.cancelled}</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-label">Completion rate</div>
              <div className="admin-stat-value">{overview.orderFunnel.completionRatePct}%</div>
            </div>
          </div>
          <div className="admin-bar-chart" style={{ marginTop: "1rem", maxWidth: "640px" }}>
            <div className="admin-bar-row">
              <label>
                <span>Completed</span>
                <span>{overview.orderFunnel.completionRatePct}%</span>
              </label>
              <div className="admin-bar-track">
                <div
                  className="admin-bar-fill"
                  style={{
                    width: `${overview.orderFunnel.created > 0 ? (overview.orderFunnel.completed / overview.orderFunnel.created) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="admin-bar-row">
              <label>
                <span>Cancelled</span>
                <span>{overview.orderFunnel.cancelRatePct}%</span>
              </label>
              <div className="admin-bar-track">
                <div
                  className="admin-bar-fill"
                  style={{
                    background: "color-mix(in srgb, #b45309 70%, transparent)",
                    width: `${overview.orderFunnel.created > 0 ? (overview.orderFunnel.cancelled / overview.orderFunnel.created) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Revenue by category</h2>
        <div className="admin-card">
          {overview.revenueByCategory.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No line-item revenue in period.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {overview.revenueByCategory.slice(0, 8).map((r) => (
                  <tr key={r.category}>
                    <td>{r.category}</td>
                    <td>{r.quantity}</td>
                    <td>{formatGhs(r.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Daily trend</h2>
        <AdminDailyTrend days={overview.dailyTrend} />
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Revenue by channel</h2>
        <div className="admin-card">
          {overview.revenueByChannel.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No completed revenue — or set channel on orders for a breakdown.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {overview.revenueByChannel.slice(0, 6).map((r) => (
                  <tr key={r.channel}>
                    <td>{r.channel}</td>
                    <td>{r.orderCount}</td>
                    <td>{formatGhs(r.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Expenses by category</h2>
        <div className="admin-card">
          {overview.expensesByCategory.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No expenses in this period.</p>
          ) : (
            <div className="admin-bar-chart">
              {overview.expensesByCategory.map((e) => (
                <div key={e.category} className="admin-bar-row">
                  <label>
                    <span>{e.category}</span>
                    <span>{formatGhs(e.amountCents)} ({totalExpenses > 0 ? Math.round((e.amountCents / totalExpenses) * 100) : 0}%)</span>
                  </label>
                  <div className="admin-bar-track">
                    <div
                      className="admin-bar-fill"
                      style={{ width: `${totalExpenses > 0 ? (e.amountCents / totalExpenses) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Top products (last 30 days)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          <div className="admin-card">
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", fontWeight: 600 }}>By revenue</h3>
            {overview.topProductsByRevenue.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No completed orders yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Revenue</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topProductsByRevenue.slice(0, 8).map((p) => (
                    <tr key={p.productId}>
                      <td>{p.name}</td>
                      <td>{formatGhs(p.revenueCents)}</td>
                      <td>{p.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="admin-card">
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", fontWeight: 600 }}>By quantity sold</h3>
            {overview.topProductsByQuantity.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No completed orders yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topProductsByQuantity.slice(0, 8).map((p) => (
                    <tr key={p.productId}>
                      <td>{p.name}</td>
                      <td>{p.quantity}</td>
                      <td>{formatGhs(p.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <div style={{ marginTop: "1.5rem" }}>
        <Link href="/admin/insights">Full insights &amp; pricing →</Link>
      </div>
    </main>
  );
}
