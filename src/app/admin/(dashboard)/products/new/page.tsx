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
  const [category, setCategory] = useState("bread");
  const [pricingMode, setPricingMode] = useState<"catalog" | "quote">("catalog");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(basePriceCents || "0") * 100);
    if (isNaN(cents) || cents < 0) { setError("Enter a valid price"); return; }
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
          category,
          pricingMode,
          active,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to create"); return; }
      // Redirect to edit page so admin can immediately add a recipe
      window.location.href = `/admin/products/${data.data.id}/edit`;
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page-shell">
      <div className="admin-section-title">
        <h1>Add product</h1>
      </div>
      <p className="admin-back-link"><Link href="/admin/products">← Products</Link></p>

      <section className="recipe-card">
        <h2 className="recipe-section-heading">Product details</h2>
        <p className="recipe-section-lead">
          Fill in the basics and save. You will land on the edit page straight away where you can add a recipe to calculate the real cost per unit.
        </p>

        <form onSubmit={handleSubmit} className="recipe-product-form">
          <div className="recipe-field">
            <label className="recipe-label" htmlFor="p-name">Name</label>
            <input id="p-name" className="recipe-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="recipe-field">
            <label className="recipe-label" htmlFor="p-desc">Description (optional)</label>
            <textarea id="p-desc" className="recipe-input recipe-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="recipe-field">
            <label className="recipe-label" htmlFor="p-img">Photo URL (optional)</label>
            <input id="p-img" type="url" className="recipe-input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… (HTTPS image)" />
          </div>
          <div className="recipe-row-2">
            <div className="recipe-field">
              <label className="recipe-label" htmlFor="p-pricing">Pricing mode</label>
              <select id="p-pricing" className="recipe-input" value={pricingMode} onChange={(e) => setPricingMode(e.target.value as "catalog" | "quote")}>
                <option value="catalog">Standard — fixed list price</option>
                <option value="quote">Quote-based — price each order from suggestions</option>
              </select>
            </div>
            <div className="recipe-field">
              <label className="recipe-label" htmlFor="p-cat">Category</label>
              <select id="p-cat" className="recipe-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="recipe-field" style={{ maxWidth: "200px" }}>
            <label className="recipe-label" htmlFor="p-price">List price (GHS)</label>
            <input id="p-price" type="number" step="0.01" min="0" className="recipe-input" value={basePriceCents} onChange={(e) => setBasePriceCents(e.target.value)} required />
          </div>
          <div className="recipe-checkbox-row">
            <input id="p-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <label htmlFor="p-active">Active — visible in shop</label>
          </div>
          {error && <p className="recipe-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: "flex-start" }}>
            {loading ? "Saving…" : "Create product & add recipe →"}
          </button>
        </form>
      </section>
    </main>
  );
}
