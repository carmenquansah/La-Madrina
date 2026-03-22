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

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (channelFilter) params.set("channel", channelFilter);
    if (orderTypeFilter) params.set("orderType", orderTypeFilter);
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
  }, [statusFilter, channelFilter, orderTypeFilter]);

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString(undefined, { dateStyle: "short" });
  }

  if (loading) return <main className="admin-page"><p>Loading…</p></main>;
  if (error) return <main className="admin-page"><p style={{ color: "#b91c1c" }}>{error}</p></main>;

  const hasFilters = !!(statusFilter || channelFilter || orderTypeFilter);
  const emptyList = orders.length === 0;

  return (
    <main className="admin-page">
      <h1>Orders</h1>
      <p className="page-desc">Filter by status and open an order to update status, channel, or type.</p>
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
                <td>{o.preferredDate ? formatDate(o.preferredDate) : "—"}</td>
                <td>{formatGhs(o.totalCents)}</td>
                <td>{o.channel ?? "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{o.orderType ?? "—"}</td>
                <td><span className={`admin-badge ${o.status === "completed" ? "ok" : o.status === "cancelled" ? "low" : "medium"}`}>{o.status}</span></td>
                <td><Link href={`/admin/orders/${o.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 && <p style={{ color: "var(--muted)", marginTop: "1rem" }}>No orders.</p>}
    </main>
  );
}
