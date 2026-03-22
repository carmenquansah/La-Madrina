"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";
import type { AdminOverviewData } from "@/lib/admin-overview-types";
import { AdminDailyTrend } from "@/components/admin/AdminDailyTrend";
import { formatPctDelta } from "@/lib/format-delta";

type Overview = AdminOverviewData;

type PricingRow = {
  productId: string;
  name: string;
  category: string;
  basePriceCents: number;
  estimatedCostCents: number | null;
  effectiveCostCents: number | null;
  costSource: "recipe" | "manual" | "none";
  marginCents: number;
  marginPct: number;
  unitsSold: number;
  revenueCents: number;
  demandTier: "high" | "medium" | "low" | "none";
  suggestedMinPriceCents: number | null;
  targetMarginPct: number;
  suggestedMinPriceNote: string;
  priceAlert: string | null;
};

type PricingData = {
  periodDays: number;
  targetMarginPct: number;
  lowMarginAlertPct: number;
  pricing: PricingRow[];
};

const TABS = ["overview", "revenue-demand", "expenses", "economics", "pricing", "shop"] as const;

type ShopActivityData = {
  periodDays: number;
  totalEvents: number;
  countsByType: Record<string, number>;
  topAddToCart: { productId: string; name: string; count: number }[];
};

type EconomicsConfig = {
  id: string | null;
  defaultLaborRateCentsPerHour: number;
  monthlyFixedCostsCents: number;
  estimatedBatchesPerMonth: number;
  persisted?: boolean;
};

export default function AdminInsightsPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<typeof TABS[number]>("pricing");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [economics, setEconomics] = useState<EconomicsConfig | null>(null);
  const [econLoading, setEconLoading] = useState(false);
  const [econSaving, setEconSaving] = useState(false);
  const [econError, setEconError] = useState("");
  const [econLabor, setEconLabor] = useState("");
  const [econFixed, setEconFixed] = useState("");
  const [econBatches, setEconBatches] = useState("");
  const [loading, setLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [pricingError, setPricingError] = useState("");
  const [exportError, setExportError] = useState("");
  const [shopActivity, setShopActivity] = useState<ShopActivityData | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState("");

  useEffect(() => {
    setLoading(true);
    setOverviewError("");
    setPricingError("");
    (async () => {
      try {
        const [oRes, pRes] = await Promise.all([
          adminFetch(`/api/admin/insights/overview?days=${days}`),
          adminFetch(`/api/admin/insights/pricing?days=${days}`),
        ]);
        const overviewJson = await oRes.json().catch(() => ({}));
        const pricingJson = await pRes.json().catch(() => ({}));
        if (oRes.ok && overviewJson.ok) setOverview(overviewJson.data);
        else {
          setOverview(null);
          setOverviewError(overviewJson.message || "Could not load overview.");
        }
        if (pRes.ok && pricingJson.ok) setPricing(pricingJson.data);
        else {
          setPricing(null);
          setPricingError(pricingJson.message || "Could not load pricing snapshot.");
        }
      } catch {
        setOverview(null);
        setPricing(null);
        setOverviewError("Failed to load insights.");
        setPricingError("Failed to load insights.");
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  useEffect(() => {
    if (tab !== "economics") return;
    setEconLoading(true);
    setEconError("");
    adminFetch("/api/admin/economics-config")
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.message || "Failed");
        const d = json.data as EconomicsConfig;
        setEconomics(d);
        setEconLabor((d.defaultLaborRateCentsPerHour / 100).toFixed(2));
        setEconFixed((d.monthlyFixedCostsCents / 100).toFixed(2));
        setEconBatches(String(d.estimatedBatchesPerMonth));
      })
      .catch(() => setEconError("Could not load economics settings"))
      .finally(() => setEconLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "shop") return;
    setShopLoading(true);
    setShopError("");
    adminFetch(`/api/admin/insights/shop-activity?days=${days}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setShopActivity(json.data);
        else {
          setShopActivity(null);
          setShopError(json.message || "Could not load shop activity.");
        }
      })
      .catch(() => {
        setShopActivity(null);
        setShopError("Could not load shop activity.");
      })
      .finally(() => setShopLoading(false));
  }, [tab, days]);

  async function downloadCsv(kind: "overview" | "pricing") {
    setExportError("");
    try {
      const res = await adminFetch(`/api/admin/insights/export?kind=${kind}&days=${days}`);
      if (!res.ok) {
        setExportError(kind === "overview" ? "Overview export failed." : "Pricing export failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "overview" ? `la-madrina-overview-${days}d.csv` : `la-madrina-pricing-${days}d.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("CSV export failed.");
    }
  }

  async function saveEconomics(e: React.FormEvent) {
    e.preventDefault();
    const laborCents = Math.round(parseFloat(econLabor || "0") * 100);
    const fixedCents = Math.round(parseFloat(econFixed || "0") * 100);
    const batches = parseInt(econBatches || "0", 10);
    if (!Number.isFinite(laborCents) || laborCents < 0 || !Number.isFinite(fixedCents) || fixedCents < 0 || !Number.isFinite(batches) || batches < 1) {
      setEconError("Enter valid numbers (batches/month at least 1).");
      return;
    }
    setEconSaving(true);
    setEconError("");
    const res = await adminFetch("/api/admin/economics-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultLaborRateCentsPerHour: laborCents,
        monthlyFixedCostsCents: fixedCents,
        estimatedBatchesPerMonth: batches,
      }),
    });
    const json = await res.json();
    setEconSaving(false);
    if (!res.ok) {
      setEconError(json.message || "Save failed");
      return;
    }
    setEconomics(json.data);
  }

  if (loading) return <div className="admin-page"><p>Loading…</p></div>;

  if (!overview && !pricing && overviewError && pricingError) {
    return (
      <div className="admin-page">
        <h1>Insights</h1>
        <p style={{ color: "#b91c1c" }}>{overviewError}</p>
        <p style={{ color: "#b91c1c" }}>{pricingError}</p>
      </div>
    );
  }

  const totalExpenses = overview?.expensesByCategory.reduce((s, e) => s + e.amountCents, 0) ?? 0;
  const maxCategoryAmount = Math.max(...(overview?.expensesByCategory.map((e) => e.amountCents) ?? [1]), 1);
  const alertsCount = pricing?.pricing.filter((p) => p.priceAlert).length ?? 0;

  return (
    <main className="admin-page">
      <h1>Insights</h1>
      <p className="page-desc">
        Periods use <strong>{overview?.businessTimeZone ?? "Africa/Accra"}</strong> calendar days. Compare each metric to the
        prior window of the same length.
      </p>

      {(overviewError || pricingError || exportError) && (
        <div
          role="alert"
          className="admin-alert-box"
          style={{ marginBottom: "1rem", borderLeft: "4px solid #b45309" }}
        >
          {overviewError && <p style={{ margin: "0 0 0.35rem" }}><strong>Overview:</strong> {overviewError}</p>}
          {pricingError && <p style={{ margin: "0 0 0.35rem" }}><strong>Pricing:</strong> {pricingError}</p>}
          {exportError && <p style={{ margin: 0 }}><strong>Export:</strong> {exportError}</p>}
        </div>
      )}

      {overview && overview.alerts.length > 0 && (
        <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <label>
          Period:
          <select
            className="admin-period-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => downloadCsv("overview")}>
          Export overview CSV
        </button>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => downloadCsv("pricing")}>
          Export pricing CSV
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "overview" && "Overview"}
            {t === "revenue-demand" && "Revenue & demand"}
            {t === "expenses" && "Expenses"}
            {t === "economics" && "Economics"}
            {t === "pricing" && `Pricing ${alertsCount > 0 ? `(${alertsCount} alerts)` : ""}`}
            {t === "shop" && "Shop funnel"}
          </button>
        ))}
      </div>

      {tab === "overview" && overviewError && !overview && (
        <p style={{ color: "#b91c1c" }} role="alert">{overviewError}</p>
      )}

      {tab === "overview" && overview && (
        <>
          <section className="admin-section">
            <h2 className="admin-section-title">Summary</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
              Current window (UTC): {new Date(overview.since).toISOString().slice(0, 10)} → before{" "}
              {new Date(overview.untilExclusive).toISOString().slice(0, 10)}. Prior window is the same number of days immediately before.
            </p>
            <div className="admin-stat-grid">
              <div className="admin-stat">
                <div className="admin-stat-label">Revenue</div>
                <div className="admin-stat-value">{formatGhs(overview.revenueCents)}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  vs prior {formatPctDelta(overview.comparison.changePct.revenueCents)}
                </div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat-label">Orders</div>
                <div className="admin-stat-value">{overview.orderCount}</div>
                <div className="admin-stat-label" style={{ marginTop: "0.35rem", fontSize: "0.75rem", opacity: 0.85 }}>
                  completed · {overview.totalOrdersInPeriod} total · vs prior orders {formatPctDelta(overview.comparison.changePct.orderCount)}
                </div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat-label">AOV</div>
                <div className="admin-stat-value">{formatGhs(overview.averageOrderValueCents)}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  vs prior {formatPctDelta(overview.comparison.changePct.averageOrderValueCents)}
                </div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat-label">Expenses</div>
                <div className="admin-stat-value">{formatGhs(overview.expensesCents)}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  vs prior {formatPctDelta(overview.comparison.changePct.expensesCents)}
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
              <div className="admin-stat">
                <div className="admin-stat-label">Profit</div>
                <div className={`admin-stat-value ${overview.grossProfitCents >= 0 ? "positive" : "negative"}`}>
                  {formatGhs(overview.grossProfitCents)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  vs prior {formatPctDelta(overview.comparison.changePct.grossProfitCents)}
                </div>
              </div>
              <div className="admin-stat">
                <div className="admin-stat-label">Cancellation rate</div>
                <div className="admin-stat-value">{overview.cancellationRatePct}%</div>
                <div className="admin-stat-label" style={{ marginTop: "0.35rem", fontSize: "0.75rem", opacity: 0.85 }}>
                  {overview.cancelledOrdersInPeriod} / {overview.totalOrdersInPeriod} · vs prior rate {formatPctDelta(overview.comparison.changePct.cancellationRatePct)}
                </div>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Order funnel</h2>
            <div className="admin-card">
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
                  <div className="admin-stat-label">Completion %</div>
                  <div className="admin-stat-value">{overview.orderFunnel.completionRatePct}%</div>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Orders by status (period)</h2>
            <div className="admin-card">
              {overview.ordersByStatus.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No orders in this period.</p>
              ) : (
                <div className="admin-bar-chart">
                  {overview.ordersByStatus.map((row) => (
                    <div key={row.status} className="admin-bar-row">
                      <label>
                        <span style={{ textTransform: "capitalize" }}>{row.status}</span>
                        <span>
                          {row.count}{" "}
                          ({overview.totalOrdersInPeriod > 0 ? Math.round((row.count / overview.totalOrdersInPeriod) * 100) : 0}%)
                        </span>
                      </label>
                      <div className="admin-bar-track">
                        <div
                          className="admin-bar-fill"
                          style={{
                            width: `${overview.totalOrdersInPeriod > 0 ? (row.count / overview.totalOrdersInPeriod) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Daily trend</h2>
            <AdminDailyTrend days={overview.dailyTrend} />
          </section>
        </>
      )}

      {tab === "revenue-demand" && overviewError && !overview && (
        <p style={{ color: "#b91c1c" }} role="alert">{overviewError}</p>
      )}

      {tab === "revenue-demand" && overview && (
        <>
          <section className="admin-section">
            <h2 className="admin-section-title">Revenue breakdown</h2>
            <div className="admin-card">
              <div className="admin-stat-grid" style={{ marginBottom: "1rem" }}>
                <div className="admin-stat">
                  <div className="admin-stat-label">Total revenue</div>
                  <div className="admin-stat-value">{formatGhs(overview.revenueCents)}</div>
                </div>
                <div className="admin-stat">
                  <div className="admin-stat-label">Completed orders</div>
                  <div className="admin-stat-value">{overview.orderCount}</div>
                </div>
                <div className="admin-stat">
                  <div className="admin-stat-label">Average order value</div>
                  <div className="admin-stat-value">{formatGhs(overview.averageOrderValueCents)}</div>
                </div>
              </div>
            </div>
          </section>
          <section className="admin-section">
            <h2 className="admin-section-title">Top products by revenue</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Revenue</th>
                    <th>Quantity sold</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topProductsByRevenue.length === 0 ? (
                    <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No completed orders in period.</td></tr>
                  ) : (
                    overview.topProductsByRevenue.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.name}</td>
                        <td>{formatGhs(p.revenueCents)}</td>
                        <td>{p.quantity}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="admin-section">
            <h2 className="admin-section-title">Top products by quantity sold (demand)</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topProductsByQuantity.length === 0 ? (
                    <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No completed orders in period.</td></tr>
                  ) : (
                    overview.topProductsByQuantity.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.name}</td>
                        <td>{p.quantity}</td>
                        <td>{formatGhs(p.revenueCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Revenue by channel</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.75rem", maxWidth: "640px" }}>
              From <strong>completed</strong> orders only. Set <code>channel</code> on each order (web, walk-in, phone, etc.) for meaningful splits.
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.revenueByChannel.length === 0 ? (
                    <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No completed revenue in period.</td></tr>
                  ) : (
                    overview.revenueByChannel.map((r) => (
                      <tr key={r.channel}>
                        <td>{r.channel}</td>
                        <td>{r.orderCount}</td>
                        <td>{formatGhs(r.revenueCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Revenue by order type</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.75rem", maxWidth: "640px" }}>
              Pickup vs delivery (or custom). From completed orders; <strong>Unspecified</strong> if <code>orderType</code> was not set.
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.revenueByOrderType.length === 0 ? (
                    <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No completed revenue in period.</td></tr>
                  ) : (
                    overview.revenueByOrderType.map((r) => (
                      <tr key={r.orderType}>
                        <td style={{ textTransform: "capitalize" }}>{r.orderType}</td>
                        <td>{r.orderCount}</td>
                        <td>{formatGhs(r.revenueCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Revenue by product category</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.75rem", maxWidth: "640px" }}>
              From completed order line items (quantity × unit price at time of order).
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Units sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.revenueByCategory.length === 0 ? (
                    <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No line items in period.</td></tr>
                  ) : (
                    overview.revenueByCategory.map((r) => (
                      <tr key={r.category}>
                        <td>{r.category}</td>
                        <td>{r.quantity}</td>
                        <td>{formatGhs(r.revenueCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "expenses" && overviewError && !overview && (
        <p style={{ color: "#b91c1c" }} role="alert">{overviewError}</p>
      )}

      {tab === "expenses" && overview && (
        <>
          <section className="admin-section">
            <h2 className="admin-section-title">Fixed vs variable</h2>
            <div className="admin-card" style={{ marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                Based on the <strong>is fixed</strong> flag on each expense (rent vs ingredients, etc.).
              </p>
              <div className="admin-stat-grid" style={{ maxWidth: "520px" }}>
                <div className="admin-stat">
                  <div className="admin-stat-label">Fixed</div>
                  <div className="admin-stat-value">{formatGhs(overview.fixedExpensesCents)}</div>
                </div>
                <div className="admin-stat">
                  <div className="admin-stat-label">Variable</div>
                  <div className="admin-stat-value">{formatGhs(overview.variableExpensesCents)}</div>
                </div>
              </div>
              {totalExpenses > 0 && (
                <div className="admin-bar-chart" style={{ marginTop: "1rem" }}>
                  <div className="admin-bar-row">
                    <label>
                      <span>Fixed share</span>
                      <span>{Math.round((overview.fixedExpensesCents / totalExpenses) * 100)}%</span>
                    </label>
                    <div className="admin-bar-track">
                      <div
                        className="admin-bar-fill"
                        style={{ width: `${(overview.fixedExpensesCents / totalExpenses) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="admin-bar-row">
                    <label>
                      <span>Variable share</span>
                      <span>{Math.round((overview.variableExpensesCents / totalExpenses) * 100)}%</span>
                    </label>
                    <div className="admin-bar-track">
                      <div
                        className="admin-bar-fill"
                        style={{ width: `${(overview.variableExpensesCents / totalExpenses) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Expenses by category</h2>
            <div className="admin-card">
              <p style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
                Total expenses: {formatGhs(totalExpenses)}
              </p>
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
                          style={{ width: `${(e.amountCents / maxCategoryAmount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {tab === "economics" && (
        <section className="admin-section">
          <h2 className="admin-section-title">Economics defaults</h2>
          <p style={{ marginBottom: "1rem", color: "var(--muted)", maxWidth: "640px" }}>
            These values drive <strong>recipe labor cost</strong> (default hourly rate) and <strong>overhead per batch</strong> when a product recipe does not set its own overhead.
            Overhead per batch ≈ monthly fixed costs ÷ estimated batches per month. Edit products under{" "}
            <Link href="/admin/products">Products</Link> → recipe, and add <Link href="/admin/ingredients">ingredients</Link> first.
          </p>
          {econLoading && <p>Loading…</p>}
          {econError && <p style={{ color: "#b91c1c" }}>{econError}</p>}
          {!econLoading && economics?.persisted === false && (
            <div className="admin-alert-box info" style={{ marginBottom: "1rem", maxWidth: "640px" }}>
              <strong>Using built-in defaults.</strong> No economics row is stored yet. Recipe/pricing math already uses these numbers.
              Saving here needs MongoDB as a <strong>replica set</strong> (e.g. Atlas or a single-node rs on your machine); if save fails with that message, defaults still apply.
            </div>
          )}
          {!econLoading && economics && (
            <form onSubmit={saveEconomics} className="admin-card" style={{ maxWidth: "480px", padding: "1.25rem" }}>
              <label style={{ display: "block", marginBottom: "1rem" }}>
                Default labor rate (GHS / hour)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={econLabor}
                  onChange={(e) => setEconLabor(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.5rem" }}
                />
              </label>
              <label style={{ display: "block", marginBottom: "1rem" }}>
                Monthly fixed costs (GHS) — rent, insurance, subscriptions, etc.
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={econFixed}
                  onChange={(e) => setEconFixed(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.5rem" }}
                />
              </label>
              <label style={{ display: "block", marginBottom: "1rem" }}>
                Estimated batches per month (for overhead allocation)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={econBatches}
                  onChange={(e) => setEconBatches(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.5rem" }}
                />
              </label>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={econSaving}>
                {econSaving ? "Saving…" : "Save economics"}
              </button>
            </form>
          )}
        </section>
      )}

      {tab === "shop" && (
        <section className="admin-section">
          <h2 className="admin-section-title">Shop funnel (anonymous)</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem", maxWidth: "640px" }}>
            Events from the public <Link href="/shop">/shop</Link> page. This is not the same as completed orders — compare
            with <Link href="/admin/orders">Orders</Link> for real sales.
          </p>
          {shopLoading && <p>Loading…</p>}
          {!shopLoading && shopActivity && (
            <>
              <div className="admin-card" style={{ marginBottom: "1.25rem" }}>
                <p style={{ marginBottom: "0.75rem" }}>
                  <strong>{shopActivity.totalEvents}</strong> events in period ({shopActivity.periodDays} days, business
                  calendar).
                </p>
                <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                  Typical path: <code>shop_view</code> → <code>product_view</code> (expand details) →{" "}
                  <code>add_to_cart</code> → <code>begin_checkout</code> (demo button).
                </p>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["shop_view", "product_view", "add_to_cart", "begin_checkout"].map((ev) => (
                        <tr key={ev}>
                          <td><code>{ev}</code></td>
                          <td>{shopActivity.countsByType[ev] ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="admin-card">
                <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Top products by add-to-cart</h3>
                {shopActivity.topAddToCart.length === 0 ? (
                  <p style={{ color: "var(--muted)" }}>No add-to-cart events in this period.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Adds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shopActivity.topAddToCart.map((r) => (
                          <tr key={r.productId}>
                            <td>{r.name}</td>
                            <td>{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
          {!shopLoading && !shopActivity && shopError && (
            <p style={{ color: "#b91c1c" }} role="alert">{shopError}</p>
          )}
          {!shopLoading && !shopActivity && !shopError && (
            <p style={{ color: "var(--muted)" }}>No shop activity data for this period.</p>
          )}
        </section>
      )}

      {tab === "pricing" && pricingError && !pricing && (
        <p style={{ color: "#b91c1c" }} role="alert">{pricingError}</p>
      )}

      {tab === "pricing" && pricing && (
        <>
          <div className="admin-alert-box info">
            <strong>Pricing guidance:</strong> Suggested minimum price uses a {pricing.targetMarginPct}% margin target from{" "}
            <strong>recipe-computed unit cost</strong> when a product has a recipe; otherwise the manual &quot;Est. cost&quot; on the product.
            Products below the suggested price or with margin under {pricing.lowMarginAlertPct}% are flagged.
          </div>
          <section className="admin-section">
            <h2 className="admin-section-title">Optimal pricing by product (last {pricing.periodDays} days)</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current price</th>
                    <th>Unit cost</th>
                    <th>Source</th>
                    <th>Margin (GHS)</th>
                    <th>Margin %</th>
                    <th>Suggested min price</th>
                    <th>Demand</th>
                    <th>Units sold</th>
                    <th>Revenue</th>
                    <th>Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.pricing.map((p) => (
                    <tr key={p.productId}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.category}</td>
                      <td>{formatGhs(p.basePriceCents)}</td>
                      <td>
                        {p.effectiveCostCents != null
                          ? formatGhs(p.effectiveCostCents)
                          : "—"}
                      </td>
                      <td>
                        {p.costSource === "recipe" && <span className="admin-badge medium">recipe</span>}
                        {p.costSource === "manual" && <span className="admin-badge low">manual</span>}
                        {p.costSource === "none" && <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td>{p.effectiveCostCents != null ? formatGhs(p.marginCents) : "—"}</td>
                      <td>{p.effectiveCostCents != null ? `${p.marginPct}%` : "—"}</td>
                      <td>
                        {p.suggestedMinPriceCents != null ? (
                          <>{formatGhs(p.suggestedMinPriceCents)} <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>({pricing.targetMarginPct}% margin)</span></>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>Set cost</span>
                        )}
                      </td>
                      <td>
                        <span className={`admin-badge ${p.demandTier}`}>{p.demandTier}</span>
                      </td>
                      <td>{p.unitsSold}</td>
                      <td>{formatGhs(p.revenueCents)}</td>
                      <td>
                        {p.priceAlert === "below_suggested" && (
                          <span className="admin-badge alert" title="Current price is below suggested minimum">Below suggested</span>
                        )}
                        {p.priceAlert === "low_margin" && (
                          <span className="admin-badge alert" title={`Margin under ${pricing.lowMarginAlertPct}%`}>Low margin</span>
                        )}
                        {!p.priceAlert && p.effectiveCostCents != null && (
                          <span className="admin-badge ok">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p style={{ marginTop: "1rem" }}>
            <Link href="/admin/products">Edit products &amp; costs →</Link>
          </p>
        </>
      )}
    </main>
  );
}
