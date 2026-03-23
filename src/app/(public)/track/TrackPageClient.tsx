"use client";

import { useState } from "react";
import { formatGhs } from "@/lib/format-money";

type OrderItem = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  specifications: string | null;
};

type TrackedOrder = {
  orderRef: string;
  status: string;
  statusLabel: string;
  totalCents: number;
  createdAt: string;
  preferredDate: string | null;
  orderType: string | null;
  notes: string | null;
  items: OrderItem[];
};

const STATUS_COLOR: Record<string, string> = {
  pending: "track-status-pending",
  confirmed: "track-status-confirmed",
  completed: "track-status-completed",
  cancelled: "track-status-cancelled",
};

const STATUS_STEPS = [
  { key: "pending", label: "Order received" },
  { key: "confirmed", label: "Payment confirmed" },
  { key: "completed", label: "Ready / delivered" },
];

function getStepIndex(status: string) {
  if (status === "cancelled") return -1;
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export function TrackPageClient() {
  const [email, setEmail] = useState("");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ email: email.trim(), ref: ref.trim() });
      const res = await fetch(`/api/track?${params}`);
      const j = await res.json();
      if (!j.ok) {
        setError(j.message ?? "Could not find your order.");
        return;
      }
      setOrder(j.data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = order ? getStepIndex(order.status) : -1;

  return (
    <main className="track-shell">
      {/* Page header */}
      <div className="track-header">
        <p className="track-eyebrow">La Madrina · Order tracking</p>
        <h1 className="track-title">Track your order</h1>
        <p className="track-lead">
          Enter the email you used when ordering and the reference number from your payment instructions.
        </p>
      </div>

      {/* Lookup form */}
      <div className="track-card">
        <form onSubmit={handleSearch} className="track-form">
          <div className="track-field">
            <label htmlFor="tr-email" className="track-label">Email address</label>
            <input
              id="tr-email"
              type="email"
              required
              className="track-input"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="track-field">
            <label htmlFor="tr-ref" className="track-label">Order reference</label>
            <input
              id="tr-ref"
              type="text"
              required
              className="track-input track-input-mono"
              placeholder="LM-A1B2C3D4"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              maxLength={11}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="track-hint">Found in your payment instructions (starts with LM-)</p>
          </div>
          {error && <p className="track-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Looking up…" : "Track order"}
          </button>
        </form>
      </div>

      {/* Order result */}
      {order && (
        <div className="track-result">
          {/* Status banner */}
          <div className={`track-status-banner ${STATUS_COLOR[order.status] ?? "track-status-pending"}`}>
            <div className="track-status-banner-inner">
              <p className="track-result-ref">{order.orderRef}</p>
              <p className="track-status-label">{order.statusLabel}</p>
            </div>
          </div>

          {/* Progress steps (not shown for cancelled) */}
          {order.status !== "cancelled" && (
            <div className="track-steps">
              {STATUS_STEPS.map((step, i) => (
                <div key={step.key} className={`track-step${i <= stepIndex ? " track-step-done" : ""}${i === stepIndex ? " track-step-current" : ""}`}>
                  <div className="track-step-dot" aria-hidden="true">
                    {i < stepIndex ? "✓" : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`track-step-line${i < stepIndex ? " track-step-line-done" : ""}`} aria-hidden="true" />
                  )}
                  <p className="track-step-label">{step.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Order summary card */}
          <div className="track-summary-card">
            <div className="track-summary-meta">
              <span>Ordered {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
              {order.orderType && <span style={{ textTransform: "capitalize" }}>{order.orderType}</span>}
              {order.preferredDate && (
                <span>Preferred: {new Date(order.preferredDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
              )}
            </div>

            <ul className="track-items">
              {order.items.map((item, i) => (
                <li key={i} className="track-item">
                  <div className="track-item-info">
                    <span className="track-item-name">{item.name}</span>
                    {item.specifications && (
                      <span className="track-item-specs">{item.specifications}</span>
                    )}
                  </div>
                  <div className="track-item-right">
                    <span className="track-item-qty">×{item.quantity}</span>
                    <span className="track-item-price">{formatGhs(item.quantity * item.unitPriceCents)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="track-total-row">
              <span>Total</span>
              <span className="track-total-value">{formatGhs(order.totalCents)}</span>
            </div>

            {order.notes && (
              <p className="track-notes">
                <strong>Notes:</strong> {order.notes}
              </p>
            )}
          </div>

          <button
            type="button"
            className="track-search-again"
            onClick={() => { setOrder(null); setRef(""); }}
          >
            Track a different order
          </button>
        </div>
      )}
    </main>
  );
}
