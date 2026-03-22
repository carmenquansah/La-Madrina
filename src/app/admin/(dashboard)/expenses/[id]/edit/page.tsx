"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";

const CATEGORIES = ["ingredients", "labor", "rent", "utilities", "marketing", "other"];

type Expense = {
  id: string;
  date: string;
  category: string;
  amountCents: number;
  description: string | null;
  isFixed: boolean;
};

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [expense, setExpense] = useState<Expense | null>(null);
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("ingredients");
  const [amountCents, setAmountCents] = useState("");
  const [description, setDescription] = useState("");
  const [isFixed, setIsFixed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminFetch(`/api/admin/expenses/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        const e = data.data as Expense;
        setExpense(e);
        setDate(new Date(e.date).toISOString().slice(0, 10));
        setCategory(e.category);
        setAmountCents((e.amountCents / 100).toFixed(2));
        setDescription(e.description || "");
        setIsFixed(e.isFixed);
      })
      .catch(() => setError("Expense not found"));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amountCents || "0") * 100);
    if (isNaN(cents) || cents < 0) {
      setError("Enter a valid amount");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          category,
          amountCents: cents,
          description: description.trim() || null,
          isFixed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to update");
        return;
      }
      router.push("/admin/expenses");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const formStyle = { display: "flex", flexDirection: "column" as const, gap: "1rem", maxWidth: "400px" };
  const inputStyle = { padding: "0.5rem 0.75rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem" };
  const labelStyle = { display: "block", marginBottom: "0.25rem", fontWeight: 500 };

  if (error && !expense) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!expense) return <p>Loading…</p>;

  return (
    <main>
      <h1>Edit expense</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
        <Link href="/admin/expenses">← Expenses</Link>
      </p>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div>
          <label htmlFor="date" style={labelStyle}>Date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <label htmlFor="category" style={labelStyle}>Category</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="amount" style={labelStyle}>Amount (GHS)</label>
          <input id="amount" type="number" step="0.01" min="0" value={amountCents} onChange={(e) => setAmountCents(e.target.value)} required style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <label htmlFor="description" style={labelStyle}>Description (optional)</label>
          <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input id="isFixed" type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} />
          <label htmlFor="isFixed">Fixed cost (rent, insurance, etc.)</label>
        </div>
        {error && <p style={{ color: "#c00" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: "0.6rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
