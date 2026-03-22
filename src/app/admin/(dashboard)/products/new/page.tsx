"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";

const CATEGORIES = ["bread", "pastries", "cakes", "custom", "other"];

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePriceCents, setBasePriceCents] = useState("");
  const [estimatedCostCents, setEstimatedCostCents] = useState("");
  const [category, setCategory] = useState("bread");
  const [pricingMode, setPricingMode] = useState<"catalog" | "quote">("catalog");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(basePriceCents || "0") * 100);
    const costCents = estimatedCostCents ? Math.round(parseFloat(estimatedCostCents) * 100) : null;
    if (isNaN(cents) || cents < 0) {
      setError("Enter a valid price");
      return;
    }
    if (costCents !== null && (isNaN(costCents) || costCents < 0)) {
      setError("Enter a valid estimated cost or leave blank");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || null,
          basePriceCents: cents,
          estimatedCostCents: estimatedCostCents ? Math.round(parseFloat(estimatedCostCents) * 100) : null,
          category,
          pricingMode,
          active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to create");
        return;
      }
      router.push("/admin/products");
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

  return (
    <main>
      <h1>Add product</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
        <Link href="/admin/products">← Products</Link>
      </p>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div>
          <label htmlFor="name" style={labelStyle}>Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <label htmlFor="description" style={labelStyle}>Description (optional)</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <label htmlFor="imageUrl" style={labelStyle}>Photo URL (shop gallery, optional)</label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div>
          <label htmlFor="pricingMode" style={labelStyle}>Pricing</label>
          <select
            id="pricingMode"
            value={pricingMode}
            onChange={(e) => setPricingMode(e.target.value as "catalog" | "quote")}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="catalog">Standard — fixed list price</option>
            <option value="quote">Quote-based — price each order from suggestions</option>
          </select>
        </div>
        <div>
          <label htmlFor="price" style={labelStyle}>List price (GHS)</label>
          <input id="price" type="number" step="0.01" min="0" value={basePriceCents} onChange={(e) => setBasePriceCents(e.target.value)} required style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <label htmlFor="cost" style={labelStyle}>Est. cost (GHS) — for margin</label>
          <input id="cost" type="number" step="0.01" min="0" value={estimatedCostCents} onChange={(e) => setEstimatedCostCents(e.target.value)} placeholder="optional" style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <label htmlFor="category" style={labelStyle}>Category</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input id="active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <label htmlFor="active">Active (visible in shop)</label>
        </div>
        {error && <p style={{ color: "#c00" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: "0.6rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Saving…" : "Create product"}
        </button>
      </form>
    </main>
  );
}
