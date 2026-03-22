"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";

type Product = {
  id: string;
  name: string;
  description: string | null;
  basePriceCents: number;
  estimatedCostCents: number | null;
  category: string;
  active: boolean;
};

type PricingRow = {
  productId: string;
  effectiveCostCents: number | null;
  costSource: "recipe" | "manual" | "none";
  suggestedMinPriceCents: number | null;
  marginPct: number;
  marginCents: number;
  unitsSold: number;
  revenueCents: number;
  demandTier: "high" | "medium" | "low" | "none";
  priceAlert: string | null;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingMap, setPricingMap] = useState<Record<string, PricingRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/products").then(async (r) => ({
        ok: r.ok,
        body: await r.json().catch(() => ({})),
      })),
      adminFetch("/api/admin/insights/pricing?days=30").then(async (r) => ({
        ok: r.ok,
        body: await r.json().catch(() => ({})),
      })),
    ])
      .then(([productsRes, pricingRes]) => {
        if (!productsRes.ok || !productsRes.body?.ok) {
          setError(productsRes.body?.message || "Failed to load products");
          setProducts([]);
          return;
        }
        setError("");
        const list = productsRes.body.data;
        setProducts(Array.isArray(list) ? list : []);
        if (pricingRes.ok && pricingRes.body?.ok && Array.isArray(pricingRes.body.data?.pricing)) {
          const map: Record<string, PricingRow> = {};
          for (const row of pricingRes.body.data.pricing) {
            map[row.productId] = row;
          }
          setPricingMap(map);
        }
      })
      .catch(() => setError("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(id: string, active: boolean) {
    const res = await adminFetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    if (!res.ok) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !active } : p))
    );
  }

  if (loading) return <div className="admin-page"><p>Loading…</p></div>;
  if (error) return <div className="admin-page"><p style={{ color: "#b91c1c" }}>{error}</p></div>;

  return (
    <main className="admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1>Products &amp; pricing</h1>
          <p className="page-desc">
            Set &quot;Est. cost&quot; per product to see margin % and optimal suggested price (30% margin target). Last 30 days for demand.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          style={{
            padding: "0.5rem 1rem",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Add product
        </Link>
      </div>

      <div className="admin-alert-box info" style={{ marginBottom: "1.25rem" }}>
        <strong>Optimal price:</strong> The suggested minimum price is what you need to charge for a 30% margin. 
        If your current price is below that, consider raising it. See <Link href="/admin/insights">Insights → Pricing</Link> for full breakdown and alerts.
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Current price</th>
              <th>Unit cost</th>
              <th>Source</th>
              <th>Margin (GHS)</th>
              <th>Margin %</th>
              <th>Suggested min price</th>
              <th>Demand</th>
              <th>Sold (30d)</th>
              <th>Revenue (30d)</th>
              <th>Alert</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const row = pricingMap[p.id];
              const unitCost =
                row?.effectiveCostCents ??
                p.estimatedCostCents ??
                null;
              const marginCents = row?.marginCents ?? (unitCost != null ? p.basePriceCents - unitCost : 0);
              const marginPct =
                row?.marginPct ??
                (p.basePriceCents > 0 && unitCost != null
                  ? Math.round(((p.basePriceCents - unitCost) / p.basePriceCents) * 100)
                  : 0);
              const suggestedMin =
                row?.suggestedMinPriceCents ??
                (unitCost != null && unitCost > 0 ? Math.ceil((unitCost * 100) / 70) : null);
              return (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.category}</td>
                  <td>{formatGhs(p.basePriceCents)}</td>
                  <td>{unitCost != null ? formatGhs(unitCost) : "—"}</td>
                  <td>
                    {row?.costSource === "recipe" && <span className="admin-badge medium">recipe</span>}
                    {row?.costSource === "manual" && <span className="admin-badge low">manual</span>}
                    {(!row || row.costSource === "none") && <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td>{unitCost != null ? formatGhs(marginCents) : "—"}</td>
                  <td>{unitCost != null ? `${marginPct}%` : "—"}</td>
                  <td>
                    {suggestedMin != null ? (
                      <span title="Min price for 30% margin">{formatGhs(suggestedMin)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row && <span className={`admin-badge ${row.demandTier}`}>{row.demandTier}</span>}
                    {!row && <span className="admin-badge none">—</span>}
                  </td>
                  <td>{row ? row.unitsSold : 0}</td>
                  <td>{row ? formatGhs(row.revenueCents) : "—"}</td>
                  <td>
                    {row?.priceAlert === "below_suggested" && <span className="admin-badge alert">Below suggested</span>}
                    {row?.priceAlert === "low_margin" && <span className="admin-badge alert">Low margin</span>}
                    {row && !row.priceAlert && unitCost != null && <span className="admin-badge ok">OK</span>}
                  </td>
                  <td>{p.active ? "Yes" : "No"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleActive(p.id, p.active)}
                      style={{ marginRight: "0.5rem", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.85rem" }}
                    >
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                    <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {products.length === 0 && <p style={{ color: "var(--muted)", marginTop: "1rem" }}>No products yet.</p>}
    </main>
  );
}
