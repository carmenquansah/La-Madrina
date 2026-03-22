"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";

type Product = {
  id: string;
  name: string;
  category: string;
  basePriceCents: number;
  pricingMode?: string | null;
  active: boolean;
};

type Line = {
  productId: string;
  quantity: number;
  specifications: string;
  unitPriceCents: number;
  quoteMinCents?: number;
  quoteMaxCents?: number;
  quoteBasis?: string;
  quoteError?: string;
};

const CHANNELS = ["web", "walk-in", "phone", "delivery-app", "wholesale"] as const;

function emptyLine(first?: Product): Line {
  if (!first) {
    return { productId: "", quantity: 1, specifications: "", unitPriceCents: 0 };
  }
  const mode = first.pricingMode ?? "catalog";
  return {
    productId: first.id,
    quantity: 1,
    specifications: "",
    unitPriceCents: mode === "quote" ? 0 : first.basePriceCents,
  };
}

export default function AdminNewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [channel, setChannel] = useState<string>("walk-in");
  const [orderType, setOrderType] = useState<string>("pickup");
  const [status, setStatus] = useState<"pending" | "confirmed">("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/products")
      .then((r) => r.json())
      .then((j) => {
        const list = Array.isArray(j.data) ? (j.data as Product[]) : [];
        const active = list.filter((p) => p.active);
        setProducts(active);
        if (active.length > 0) {
          setLines([emptyLine(active[0])]);
        } else {
          setLines([emptyLine()]);
        }
      })
      .catch(() => setError("Could not load products"))
      .finally(() => setLoading(false));
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const refreshPricing = useCallback(
    async (lineIndex: number, productId: string, quantity: number) => {
      const p = byId.get(productId);
      if (!p || !productId) return;
      const mode = p.pricingMode ?? "catalog";
      if (mode === "quote") {
        const res = await adminFetch(
          `/api/admin/pricing/quote-suggestion?productId=${encodeURIComponent(productId)}&quantity=${quantity}`
        );
        const j = await res.json();
        if (j.ok && j.data) {
          setLines((prev) =>
            prev.map((row, idx) =>
              idx === lineIndex
                ? {
                    ...row,
                    unitPriceCents: j.data.suggestedUnitCents,
                    quoteMinCents: j.data.minUnitCents,
                    quoteMaxCents: j.data.maxUnitCents,
                    quoteBasis: j.data.basisNote,
                    quoteError: undefined,
                  }
                : row
            )
          );
        } else {
          setLines((prev) =>
            prev.map((row, idx) =>
              idx === lineIndex
                ? {
                    ...row,
                    unitPriceCents: p.basePriceCents,
                    quoteMinCents: undefined,
                    quoteMaxCents: undefined,
                    quoteBasis: undefined,
                    quoteError: j.message ?? "Could not load quote suggestion",
                  }
                : row
            )
          );
        }
      } else {
        setLines((prev) =>
          prev.map((row, idx) =>
            idx === lineIndex
              ? {
                  ...row,
                  unitPriceCents: p.basePriceCents,
                  quoteMinCents: undefined,
                  quoteMaxCents: undefined,
                  quoteBasis: undefined,
                  quoteError: undefined,
                }
              : row
          )
        );
      }
    },
    [byId]
  );

  useEffect(() => {
    if (loading || products.length === 0) return;
    const id = lines[0]?.productId;
    if (!id) return;
    void refreshPricing(0, id, lines[0].quantity);
  }, [loading, products, lines[0]?.productId, lines[0]?.quantity, refreshPricing]);

  const previewTotal = useMemo(() => {
    let t = 0;
    for (const row of lines) {
      if (!row.productId || row.unitPriceCents < 1) continue;
      t += row.quantity * row.unitPriceCents;
    }
    return t;
  }, [lines]);

  function addLine() {
    const first = products[0];
    if (!first) return;
    setLines((prev) => {
      const idx = prev.length;
      const nl: Line = {
        productId: first.id,
        quantity: 1,
        specifications: "",
        unitPriceCents: first.pricingMode === "quote" ? 0 : first.basePriceCents,
      };
      queueMicrotask(() => void refreshPricing(idx, first.id, 1));
      return [...prev, nl];
    });
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payloadItems = lines
      .filter((row) => row.productId)
      .map((row) => {
        const p = byId.get(row.productId);
        const mode = p?.pricingMode ?? "catalog";
        const base: {
          productId: string;
          quantity: number;
          specifications: string | null;
          unitPriceCents?: number;
        } = {
          productId: row.productId,
          quantity: row.quantity,
          specifications: row.specifications.trim() || null,
        };
        if (mode === "quote" || row.unitPriceCents !== (p?.basePriceCents ?? 0)) {
          base.unitPriceCents = row.unitPriceCents;
        }
        if (mode === "catalog" && base.unitPriceCents === undefined) {
          base.unitPriceCents = p!.basePriceCents;
        }
        return base;
      });
    if (payloadItems.length === 0) {
      setError("Add at least one product line.");
      return;
    }
    for (const it of payloadItems) {
      if (!it.unitPriceCents || it.unitPriceCents < 1) {
        setError("Each line needs a valid unit price (GHS). For quote items, enter the agreed price.");
        return;
      }
    }
    setSaving(true);
    const res = await adminFetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || null,
        preferredDate: preferredDate ? new Date(preferredDate).toISOString() : null,
        notes: notes.trim() || null,
        internalNotes: internalNotes.trim() || null,
        channel,
        orderType: orderType || null,
        status,
        items: payloadItems.map(({ productId, quantity, specifications, unitPriceCents }) => ({
          productId,
          quantity,
          specifications,
          unitPriceCents,
        })),
      }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok || !j.ok) {
      setError(j.message || "Could not create order");
      return;
    }
    router.push(`/admin/orders/${j.data.id}`);
  }

  if (loading) return <main className="admin-page"><p>Loading…</p></main>;

  return (
    <main className="admin-page">
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/admin/orders">← Orders</Link>
      </p>
      <h1>New order</h1>
      <p className="page-desc">
        <strong>Standard products</strong> use the list price; you can change the unit price before saving.{" "}
        <strong>Quote-based</strong> items get a suggested range from your recipe or estimated cost — set the agreed price
        before creating the order (e.g. while status stays pending until the customer confirms).
      </p>

      {products.length === 0 && (
        <p style={{ color: "#b45309", marginBottom: "1rem" }} role="alert">
          No active products. Add products first.
        </p>
      )}

      <form onSubmit={handleSubmit} className="admin-card" style={{ padding: "1.25rem", maxWidth: "720px" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Customer</h2>
        <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <label>
            Name <span style={{ color: "#b91c1c" }}>*</span>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.45rem 0.65rem" }}
            />
          </label>
          <label>
            Email <span style={{ color: "#b91c1c" }}>*</span>
            <input
              required
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.45rem 0.65rem" }}
            />
          </label>
          <label>
            Phone
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.45rem 0.65rem" }}
            />
          </label>
          <label>
            Preferred date / time
            <input
              type="datetime-local"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.45rem 0.65rem" }}
            />
          </label>
        </div>

        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Line items</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
          {lines.map((row, i) => {
            const p = row.productId ? byId.get(row.productId) : undefined;
            const mode = p?.pricingMode ?? "catalog";
            return (
              <div
                key={i}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
                  <label style={{ fontSize: "0.85rem", flex: "1 1 200px" }}>
                    Product
                    <select
                      className="admin-period-select"
                      style={{ marginBottom: 0, width: "100%" }}
                      value={row.productId}
                      onChange={(e) => {
                        const id = e.target.value;
                        updateLine(i, { productId: id });
                        const pr = byId.get(id);
                        const q = row.quantity;
                        if (pr && (pr.pricingMode ?? "catalog") !== "quote") {
                          updateLine(i, {
                            unitPriceCents: pr.basePriceCents,
                            quoteMinCents: undefined,
                            quoteMaxCents: undefined,
                            quoteBasis: undefined,
                            quoteError: undefined,
                          });
                        }
                        void refreshPricing(i, id, q);
                      }}
                    >
                      <option value="">—</option>
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name}
                          {(prod.pricingMode ?? "catalog") === "quote" ? " (quote)" : ` (${formatGhs(prod.basePriceCents)})`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: "0.85rem", width: "88px" }}>
                    Qty
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={row.quantity}
                      onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.45rem 0.65rem",
                        border: "1px solid var(--border-strong)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 1}
                  >
                    Remove line
                  </button>
                </div>

                {p && mode === "quote" && (row.quoteMinCents != null || row.quoteError) && (
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                      background: "var(--accent-soft)",
                      padding: "0.5rem 0.65rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {row.quoteError ? (
                      <span style={{ color: "#b45309" }}>{row.quoteError}</span>
                    ) : (
                      <>
                        <strong>Suggested band (per unit):</strong> {formatGhs(row.quoteMinCents!)} –{" "}
                        {formatGhs(row.quoteMaxCents!)}
                        {" · "}
                        <strong>Suggested:</strong> {formatGhs(row.unitPriceCents)}
                        {row.quoteBasis && (
                          <>
                            <br />
                            {row.quoteBasis}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                <label style={{ fontSize: "0.85rem" }}>
                  Agreed unit price (GHS) <span style={{ color: "#b91c1c" }}>*</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={row.unitPriceCents > 0 ? (row.unitPriceCents / 100).toFixed(2) : ""}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!Number.isNaN(n) && n >= 0) {
                        updateLine(i, { unitPriceCents: Math.round(n * 100) });
                      }
                    }}
                    placeholder={mode === "quote" ? "Set after agreeing with customer" : "Override list price if needed"}
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: "200px",
                      marginTop: "0.35rem",
                      padding: "0.45rem 0.65rem",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                </label>
                {p && mode === "catalog" && (
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
                    List price: {formatGhs(p.basePriceCents)} — change the field above only if you are offering a different
                    price.
                  </p>
                )}

                <label style={{ fontSize: "0.85rem" }}>
                  Specs (allergies, message, options)
                  <input
                    value={row.specifications}
                    onChange={(e) => updateLine(i, { specifications: e.target.value })}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "0.35rem",
                      padding: "0.45rem 0.65rem",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <button type="button" className="admin-btn admin-btn-sm" onClick={addLine} style={{ marginBottom: "1.25rem" }}>
          + Add line
        </button>

        <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem", maxWidth: "480px" }}>
          <label>
            Channel
            <select
              className="admin-period-select"
              style={{ marginBottom: 0, display: "block", marginTop: "0.35rem" }}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Order type
            <select
              className="admin-period-select"
              style={{ marginBottom: 0, display: "block", marginTop: "0.35rem" }}
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <option value="">—</option>
              <option value="pickup">pickup</option>
              <option value="delivery">delivery</option>
            </select>
          </label>
          <label>
            Initial status
            <select
              className="admin-period-select"
              style={{ marginBottom: 0, display: "block", marginTop: "0.35rem" }}
              value={status}
              onChange={(e) => setStatus(e.target.value as "pending" | "confirmed")}
            >
              <option value="pending">pending (quote not final)</option>
              <option value="confirmed">confirmed (price agreed)</option>
            </select>
          </label>
        </div>

        <label style={{ display: "block", marginBottom: "0.75rem" }}>
          Customer-visible notes
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.5rem 0.65rem", resize: "vertical" }}
            placeholder="Shown on packing slips / shared with kitchen"
          />
        </label>
        <label style={{ display: "block", marginBottom: "1rem" }}>
          Internal notes (staff only)
          <textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.5rem 0.65rem", resize: "vertical" }}
            placeholder="Not for customer-facing receipts"
          />
        </label>

        <p style={{ fontWeight: 600, marginBottom: "1rem" }}>
          Order total (preview): {formatGhs(previewTotal)}
        </p>

        {error && (
          <p style={{ color: "#b91c1c", marginBottom: "1rem" }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="admin-btn" disabled={saving || products.length === 0}>
          {saving ? "Saving…" : "Create order"}
        </button>
      </form>
    </main>
  );
}
