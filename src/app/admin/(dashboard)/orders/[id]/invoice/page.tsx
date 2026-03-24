"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  deliveryAddress: string | null;
  createdAt: string;
  items: OrderItem[];
};

function invoiceNumber(id: string, createdAt: string) {
  const year = new Date(createdAt).getFullYear();
  return `INV-LM-${year}-${id.slice(0, 8).toUpperCase()}`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function InvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch(`/api/admin/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setOrder(data.data))
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="inv-shell"><p className="inv-loading">Loading invoice…</p></main>;
  if (error || !order) return <main className="inv-shell"><p style={{ color: "#c00" }}>{error || "Not found"}</p></main>;

  const invNum = invoiceNumber(order.id, order.createdAt);
  const isPaid = order.status === "confirmed" || order.status === "completed";

  return (
    <main className="inv-shell">
      {/* Toolbar — hidden on print */}
      <div className="inv-toolbar no-print">
        <Link href={`/admin/orders/${id}`} className="inv-back">← Back to order</Link>
        <button className="admin-btn" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      {/* Invoice document */}
      <div className="inv-doc">

        {/* Header */}
        <header className="inv-header">
          <div className="inv-brand">
            <span className="inv-brand-name">La Madrina</span>
            <span className="inv-brand-tagline">Bakery</span>
          </div>
          <div className="inv-title-block">
            <p className="inv-title-word">INVOICE</p>
            <p className="inv-number">{invNum}</p>
          </div>
        </header>

        {/* Business + Customer meta */}
        <div className="inv-meta-row">
          <div className="inv-meta-block">
            <p className="inv-meta-label">From</p>
            <p className="inv-meta-line inv-meta-strong">La Madrina Bakery</p>
            <p className="inv-meta-line">Mitchel Street, Tema, Ghana</p>
            <p className="inv-meta-line">lamadrinabakery@gmail.com</p>
            <p className="inv-meta-line">0546368357 (MTN MoMo)</p>
          </div>

          <div className="inv-meta-block">
            <p className="inv-meta-label">Bill To</p>
            <p className="inv-meta-line inv-meta-strong">{order.customerName}</p>
            <p className="inv-meta-line">{order.customerEmail}</p>
            {order.customerPhone && <p className="inv-meta-line">{order.customerPhone}</p>}
            {order.deliveryAddress && (
              <>
                <p className="inv-meta-label" style={{ marginTop: "0.75rem" }}>Delivery Address</p>
                <p className="inv-meta-line" style={{ whiteSpace: "pre-line" }}>{order.deliveryAddress}</p>
              </>
            )}
          </div>

          <div className="inv-meta-block inv-meta-right">
            <p className="inv-meta-label">Details</p>
            <p className="inv-meta-line">
              <span className="inv-meta-key">Date issued:</span>{" "}
              {formatDate(order.createdAt)}
            </p>
            {order.preferredDate && (
              <p className="inv-meta-line">
                <span className="inv-meta-key">Delivery / pickup:</span>{" "}
                {formatDate(order.preferredDate)}
              </p>
            )}
            <p className="inv-meta-line">
              <span className="inv-meta-key">Type:</span>{" "}
              {order.orderType ? order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1) : "—"}
            </p>
            <p className="inv-meta-line">
              <span className="inv-meta-key">Status:</span>{" "}
              <span className={`inv-status-badge inv-status-${order.status}`}>
                {statusLabel(order.status)}
              </span>
            </p>
          </div>
        </div>

        {/* Line items */}
        <table className="inv-table">
          <thead>
            <tr>
              <th className="inv-th inv-th-desc">Description</th>
              <th className="inv-th inv-th-num">Qty</th>
              <th className="inv-th inv-th-num">Unit Price</th>
              <th className="inv-th inv-th-num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="inv-tr">
                <td className="inv-td inv-td-desc">
                  <span className="inv-item-name">{item.product.name}</span>
                  {item.specifications && (
                    <span className="inv-item-spec">{item.specifications}</span>
                  )}
                </td>
                <td className="inv-td inv-td-num">{item.quantity}</td>
                <td className="inv-td inv-td-num">{formatGhs(item.unitPriceCents)}</td>
                <td className="inv-td inv-td-num">{formatGhs(item.quantity * item.unitPriceCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="inv-total-row">
              <td colSpan={3} className="inv-total-label">Total</td>
              <td className="inv-total-amount">{formatGhs(order.totalCents)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Customer notes */}
        {order.notes && (
          <div className="inv-notes-block">
            <p className="inv-notes-label">Notes</p>
            <p className="inv-notes-text">{order.notes}</p>
          </div>
        )}

        {/* Payment instructions — shown only when pending */}
        {!isPaid && (
          <div className="inv-payment-block">
            <p className="inv-payment-title">Payment Instructions</p>
            <p className="inv-payment-line">
              Please send <strong>{formatGhs(order.totalCents)}</strong> via MTN Mobile Money to:
            </p>
            <div className="inv-momo-box">
              <span className="inv-momo-number">0546368357</span>
              <span className="inv-momo-name">La Madrina Bakery</span>
            </div>
            <p className="inv-payment-ref">
              Reference your invoice number <strong>{invNum}</strong> in the payment note.
            </p>
          </div>
        )}

        {isPaid && (
          <div className="inv-paid-stamp">
            <span>PAID</span>
          </div>
        )}

        {/* Footer */}
        <footer className="inv-footer">
          <p>Thank you for choosing La Madrina Bakery!</p>
          <p>Questions? Email us at lamadrinabakery@gmail.com or WhatsApp 0546368357</p>
        </footer>
      </div>
    </main>
  );
}
