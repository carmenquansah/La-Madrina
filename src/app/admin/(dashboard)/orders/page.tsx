"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";

type OrderItem = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  product: { name: string };
};

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  preferredDate: string | null;
  status: string;
  totalCents: number;
  createdAt: string;
  channel: string | null;
  orderType: string | null;
  items: OrderItem[];
};

const CHANNELS = ["web", "walk-in", "phone", "delivery-app", "wholesale"] as const;
const ORDER_TYPES = ["pickup", "delivery"] as const;
const UNSET = "__unset__";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (channelFilter) params.set("channel", channelFilter);
    if (orderTypeFilter) params.set("orderType", orderTypeFilter);
    if (debouncedSearch) params.set("q", debouncedSearch);
    const q = params.toString();
    const url = q ? `/api/admin/orders?${q}` : "/api/admin/orders";
    adminFetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setOrders(Array.isArray(data.data) ? data.data : []))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [statusFilter, channelFilter, orderTypeFilter, debouncedSearch]);

  async function confirmPayment(orderId: string) {
    setConfirmingId(orderId);
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "confirmed" } : o)));
      }
    } finally {
      setConfirmingId(null);
    }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString(undefined, { dateStyle: "short" });
  }

  if (loading) return <main className="admin-page"><p>Loading…</p></main>;
  if (error) return <main className="admin-page"><p style={{ color: "#b91c1c" }}>{error}</p></main>;

  const hasFilters = !!(statusFilter || channelFilter || orderTypeFilter || debouncedSearch);
  const emptyList = orders.length === 0;

  return (
    <main className="admin-page">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
        <Link href="/admin/orders/new" className="admin-btn">
          + New order
        </Link>
      </div>
      <p className="page-desc">Search by customer name, email, or phone. Filter by status, channel, or type.</p>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem" }}>Search</label>
        <input
          type="search"
          placeholder="Name, email, phone…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "0.5rem 0.75rem",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.95rem",
          }}
        />
      </div>
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Status:
          <select
            className="admin-period-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label>
          Channel:
          <select
            className="admin-period-select"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value="">Any</option>
            <option value={UNSET}>Not set</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Type:
          <select
            className="admin-period-select"
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value="">Any</option>
            <option value={UNSET}>Not set</option>
            {ORDER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      {emptyList && (
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
          {hasFilters ? "No orders match the current filters." : "No orders yet."}
        </p>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Preferred date</th>
              <th>Total</th>
              <th>Channel</th>
              <th>Type</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{formatDate(o.createdAt)}</td>
                <td>{o.customerName}</td>
                <td>{o.customerPhone ?? "—"}</td>
                <td>{o.preferredDate ? formatDate(o.preferredDate) : "—"}</td>
                <td>{formatGhs(o.totalCents)}</td>
                <td>{o.channel ?? "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{o.orderType ?? "—"}</td>
                <td><span className={`admin-badge ${o.status === "completed" ? "ok" : o.status === "cancelled" ? "low" : "medium"}`}>{o.status}</span></td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    {o.status === "pending" && o.channel === "web" && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-confirm"
                        disabled={confirmingId === o.id}
                        onClick={() => confirmPayment(o.id)}
                        title="Mark payment received and confirm order"
                      >
                        {confirmingId === o.id ? "…" : "✓ Payment received"}
                      </button>
                    )}
                    <Link href={`/admin/orders/${o.id}`}>View</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 && <p style={{ color: "var(--muted)", marginTop: "1rem" }}>No orders.</p>}
    </main>
  );
}
