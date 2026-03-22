"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";

type Expense = {
  id: string;
  date: string;
  category: string;
  amountCents: number;
  description: string | null;
  isFixed: boolean;
};

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/expenses")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setExpenses(data.data))
      .catch(() => setError("Failed to load expenses"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await adminFetch(`/api/admin/expenses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString(undefined, { dateStyle: "short" });
  }

  if (loading) return <main className="admin-page"><p>Loading…</p></main>;
  if (error) return <main className="admin-page"><p style={{ color: "#b91c1c" }}>{error}</p></main>;

  const total = expenses.reduce((s, e) => s + e.amountCents, 0);

  return (
    <main className="admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1>Expenses</h1>
          <p className="page-desc">Total: {formatGhs(total)}. Mark fixed (rent, insurance) vs variable (ingredients, labor).</p>
        </div>
        <Link
          href="/admin/expenses/new"
          style={{
            padding: "0.5rem 1rem",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Add expense
        </Link>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Fixed</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{formatDate(e.date)}</td>
                <td>{e.category}</td>
                <td>{formatGhs(e.amountCents)}</td>
                <td>{e.isFixed ? "Yes" : "No"}</td>
                <td style={{ maxWidth: "200px" }}>{e.description || "—"}</td>
                <td>
                  <Link href={`/admin/expenses/${e.id}/edit`} style={{ marginRight: "0.5rem" }}>Edit</Link>
                  <button type="button" onClick={() => handleDelete(e.id)} style={{ color: "#b91c1c", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.9rem" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {expenses.length === 0 && <p style={{ color: "var(--muted)", marginTop: "1rem" }}>No expenses yet.</p>}
    </main>
  );
}
