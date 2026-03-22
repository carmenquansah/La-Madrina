"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";

type OrderItem = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  specifications: string | null;
  product: { id: string; name: string };
};

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  preferredDate: string | null;
  status: string;
  totalCents: number;
  notes: string | null;
  channel: string | null;
  orderType: string | null;
  createdAt: string;
  items: OrderItem[];
};

const STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
const CHANNELS = ["web", "walk-in", "phone", "delivery-app", "wholesale"] as const;
const ORDER_TYPES = ["pickup", "delivery"] as const;

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState<string>("");
  const [orderType, setOrderType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch(`/api/admin/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setOrder(data.data);
        setStatus(data.data.status);
        setChannel(data.data.channel ?? "");
        setOrderType(data.data.orderType ?? "");
      })
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdate(field: "status" | "channel" | "orderType", value: string) {
    setSaving(true);
    const payload = field === "status" ? { status: value } : field === "channel" ? { channel: value || null } : { orderType: value || null };
    const res = await adminFetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok && order) {
      if (field === "status") {
        setOrder({ ...order, status: value });
        setStatus(value);
      } else if (field === "channel") {
        setOrder({ ...order, channel: value || null });
        setChannel(value);
      } else {
        setOrder({ ...order, orderType: value || null });
        setOrderType(value);
      }
    }
    setSaving(false);
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  if (loading || (!order && !error)) return <p>Loading…</p>;
  if (error || !order) return <p style={{ color: "#c00" }}>{error || "Not found"}</p>;

  return (
    <main>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/admin/orders">← Orders</Link>
      </p>
      <h1>Order {order.id.slice(0, 8)}…</h1>
      <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
        <section>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Customer</h2>
          <p>{order.customerName}</p>
          <p><a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a></p>
          {order.customerPhone && <p>{order.customerPhone}</p>}
        </section>
        <section>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Details</h2>
          <p>Placed: {formatDate(order.createdAt)}</p>
          <p>Preferred date: {order.preferredDate ? formatDate(order.preferredDate) : "—"}</p>
          <p>Total: {formatGhs(order.totalCents)}</p>
        </section>
        <section>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Status</h2>
          <select value={status} onChange={(e) => handleUpdate("status", e.target.value)} disabled={saving} style={{ padding: "0.4rem 0.75rem" }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </section>
        <section>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Channel</h2>
          <select value={channel} onChange={(e) => handleUpdate("channel", e.target.value)} disabled={saving} style={{ padding: "0.4rem 0.75rem" }}>
            <option value="">—</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </section>
        <section>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Type</h2>
          <select value={orderType} onChange={(e) => handleUpdate("orderType", e.target.value)} disabled={saving} style={{ padding: "0.4rem 0.75rem" }}>
            <option value="">—</option>
            {ORDER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </section>
      </div>
      {order.notes && (
        <p style={{ marginTop: "1rem", color: "var(--muted)" }}><strong>Notes:</strong> {order.notes}</p>
      )}
      <h2 style={{ fontSize: "1rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>Items</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th style={{ padding: "0.5rem" }}>Product</th>
            <th style={{ padding: "0.5rem" }}>Qty</th>
            <th style={{ padding: "0.5rem" }}>Unit price</th>
            <th style={{ padding: "0.5rem" }}>Subtotal</th>
            <th style={{ padding: "0.5rem" }}>Specifications</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.5rem" }}>{item.product.name}</td>
              <td style={{ padding: "0.5rem" }}>{item.quantity}</td>
              <td style={{ padding: "0.5rem" }}>{formatGhs(item.unitPriceCents)}</td>
              <td style={{ padding: "0.5rem" }}>{formatGhs(item.quantity * item.unitPriceCents)}</td>
              <td style={{ padding: "0.5rem", maxWidth: "200px" }}>{item.specifications || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
