"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";

const CATEGORIES = ["bread", "pastries", "cakes", "custom", "other"];

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePriceCents: number;
  estimatedCostCents: number | null;
  category: string;
  active: boolean;
};

type IngredientOption = {
  id: string;
  name: string;
  unit: string;
};

type RecipeLine = {
  key: string;
  ingredientId: string;
  amount: string;
  wasteFactor: string;
};

type RecipeComputed = {
  ingredientsCents: number;
  laborCents: number;
  overheadCents: number;
  totalBatchCents: number;
  unitCostCents: number;
};

function newLineKey() {
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePriceCents, setBasePriceCents] = useState("");
  const [estimatedCostCents, setEstimatedCostCents] = useState("");
  const [category, setCategory] = useState("bread");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(true);
  const [recipeError, setRecipeError] = useState("");
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [hasRecipe, setHasRecipe] = useState(false);
  const [batchSize, setBatchSize] = useState("1");
  const [laborMinutes, setLaborMinutes] = useState("0");
  const [laborRateDollars, setLaborRateDollars] = useState("");
  const [overheadDollars, setOverheadDollars] = useState("");
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [computed, setComputed] = useState<RecipeComputed | null>(null);

  const loadRecipe = useCallback(async () => {
    setRecipeLoading(true);
    setRecipeError("");
    try {
      const [ingRes, recRes] = await Promise.all([
        adminFetch("/api/admin/ingredients").then((r) => r.json()),
        adminFetch(`/api/admin/products/${id}/recipe`).then((r) => r.json()),
      ]);
      if (ingRes.ok && Array.isArray(ingRes.data)) {
        setIngredients(
          ingRes.data.map((i: { id: string; name: string; unit: string }) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
          }))
        );
      }
      if (!recRes.ok) {
        setRecipeError(recRes.message || "Could not load recipe");
        setRecipeLoading(false);
        return;
      }
      const data = recRes.data;
      if (data.recipe) {
        setHasRecipe(true);
        setBatchSize(String(data.recipe.batchSize));
        setLaborMinutes(String(data.recipe.laborMinutesPerBatch));
        setLaborRateDollars(
          data.recipe.laborRateCentsPerHour != null
            ? (data.recipe.laborRateCentsPerHour / 100).toFixed(2)
            : ""
        );
        setOverheadDollars(
          data.recipe.overheadCentsPerBatch != null
            ? (data.recipe.overheadCentsPerBatch / 100).toFixed(2)
            : ""
        );
        setLines(
          data.recipe.lines.map(
            (l: { ingredientId: string; amount: number; wasteFactor: number }) => ({
              key: newLineKey(),
              ingredientId: l.ingredientId,
              amount: String(l.amount),
              wasteFactor: String(l.wasteFactor ?? 0),
            })
          )
        );
      } else {
        setHasRecipe(false);
        setBatchSize("1");
        setLaborMinutes("0");
        setLaborRateDollars("");
        setOverheadDollars("");
        setLines([]);
      }
      setComputed(data.computed ?? null);
    } catch {
      setRecipeError("Failed to load recipe");
    } finally {
      setRecipeLoading(false);
    }
  }, [id]);

  useEffect(() => {
    adminFetch(`/api/admin/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        const p = data.data as Product;
        setProduct(p);
        setName(p.name);
        setDescription(p.description || "");
        setBasePriceCents((p.basePriceCents / 100).toFixed(2));
        setEstimatedCostCents(p.estimatedCostCents != null ? (p.estimatedCostCents / 100).toFixed(2) : "");
        setCategory(p.category);
        setActive(p.active);
        setImageUrl(p.imageUrl ?? "");
      })
      .catch(() => setError("Product not found"));
  }, [id]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

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
      const res = await adminFetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          basePriceCents: cents,
          estimatedCostCents: costCents,
          category,
          active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to update");
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

  function addLine() {
    const first = ingredients[0];
    setLines((prev) => [
      ...prev,
      {
        key: newLineKey(),
        ingredientId: first?.id ?? "",
        amount: "1",
        wasteFactor: "0",
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<RecipeLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault();
    const bs = parseInt(batchSize, 10);
    const laborMin = parseFloat(laborMinutes);
    if (!Number.isFinite(bs) || bs < 1 || !Number.isFinite(laborMin) || laborMin < 0) {
      setRecipeError("Batch size (≥1) and labor minutes (≥0) are required.");
      return;
    }
    const laborRateParsed = laborRateDollars.trim() === "" ? null : parseFloat(laborRateDollars);
    const overheadParsed = overheadDollars.trim() === "" ? null : parseFloat(overheadDollars);
    if (laborRateParsed !== null && (!Number.isFinite(laborRateParsed) || laborRateParsed < 0)) {
      setRecipeError("Invalid labor rate override.");
      return;
    }
    if (overheadParsed !== null && (!Number.isFinite(overheadParsed) || overheadParsed < 0)) {
      setRecipeError("Invalid overhead override.");
      return;
    }
    const payloadLines = [];
    for (const l of lines) {
      if (!l.ingredientId) continue;
      const amt = parseFloat(l.amount);
      const waste = parseFloat(l.wasteFactor || "0");
      if (!Number.isFinite(amt) || amt <= 0) {
        setRecipeError("Each line needs a positive amount.");
        return;
      }
      if (!Number.isFinite(waste) || waste < 0 || waste > 1) {
        setRecipeError("Waste factor must be between 0 and 1.");
        return;
      }
      payloadLines.push({
        ingredientId: l.ingredientId,
        amount: amt,
        wasteFactor: waste,
      });
    }
    setRecipeSaving(true);
    setRecipeError("");
    try {
      const res = await adminFetch(`/api/admin/products/${id}/recipe`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchSize: bs,
          laborMinutesPerBatch: laborMin,
          laborRateCentsPerHour:
            laborRateParsed === null ? null : Math.round(laborRateParsed * 100),
          overheadCentsPerBatch:
            overheadParsed === null ? null : Math.round(overheadParsed * 100),
          lines: payloadLines,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRecipeError(json.message || "Recipe save failed");
        return;
      }
      setHasRecipe(true);
      setComputed(json.data.computed ?? null);
    } catch {
      setRecipeError("Recipe save failed");
    } finally {
      setRecipeSaving(false);
    }
  }

  function applyComputedCost() {
    if (!computed) return;
    setEstimatedCostCents((computed.unitCostCents / 100).toFixed(2));
  }

  const formStyle = { display: "flex", flexDirection: "column" as const, gap: "1rem", maxWidth: "400px" };
  const inputStyle = { padding: "0.5rem 0.75rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem" };
  const labelStyle = { display: "block", marginBottom: "0.25rem", fontWeight: 500 };

  if (error && !product) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <main className="admin-page">
      <h1>Edit product</h1>
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
          <label htmlFor="imageUrl" style={labelStyle}>Photo URL (shop gallery)</label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… (HTTPS image for the menu)"
            style={{ ...inputStyle, width: "100%" }}
          />
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.35rem" }}>
            Shown in the public shop masonry. Leave blank to use a category placeholder.
          </p>
        </div>
        <div>
          <label htmlFor="price" style={labelStyle}>Price (GHS)</label>
          <input id="price" type="number" step="0.01" min="0" value={basePriceCents} onChange={(e) => setBasePriceCents(e.target.value)} required style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div>
          <label htmlFor="cost" style={labelStyle}>Est. cost (GHS) — manual override / stored on product</label>
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
        <button type="submit" disabled={loading} className="admin-btn admin-btn-primary" style={{ alignSelf: "flex-start" }}>
          {loading ? "Saving…" : "Save product & leave"}
        </button>
      </form>

      <section className="admin-card" style={{ marginTop: "2rem", maxWidth: "720px" }}>
        <h2 className="admin-card-title">Recipe &amp; unit cost</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Define batch size, labor, optional rate/overhead overrides, and ingredient amounts per batch (same units as in{" "}
          <Link href="/admin/ingredients">Ingredients</Link>). Save the recipe, then use <strong>Apply to Est. cost</strong> to copy the computed unit cost into the field above (optional; pricing insights use the recipe directly when present).
        </p>
        {recipeLoading && <p>Loading recipe…</p>}
        {recipeError && <p className="admin-error">{recipeError}</p>}
        {!recipeLoading && (
          <form onSubmit={saveRecipe} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <label style={{ ...labelStyle, minWidth: "120px" }}>
                Batch size (units)
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </label>
              <label style={{ ...labelStyle, minWidth: "140px" }}>
                Labor min / batch
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={laborMinutes}
                  onChange={(e) => setLaborMinutes(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </label>
              <label style={{ ...labelStyle, minWidth: "140px" }}>
                Labor GHS/hr (optional)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={laborRateDollars}
                  onChange={(e) => setLaborRateDollars(e.target.value)}
                  placeholder="use default"
                  style={{ ...inputStyle, width: "100%" }}
                />
              </label>
              <label style={{ ...labelStyle, minWidth: "140px" }}>
                Overhead GHS/batch (optional)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={overheadDollars}
                  onChange={(e) => setOverheadDollars(e.target.value)}
                  placeholder="from economics"
                  style={{ ...inputStyle, width: "100%" }}
                />
              </label>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <strong>Ingredients per batch</strong>
                <button type="button" className="admin-btn admin-btn-sm" onClick={addLine} disabled={ingredients.length === 0}>
                  Add line
                </button>
              </div>
              {ingredients.length === 0 && (
                <p style={{ color: "var(--muted)" }}>Add ingredients in the catalog first.</p>
              )}
              {lines.length === 0 && ingredients.length > 0 && (
                <p style={{ color: "var(--muted)" }}>No lines yet — click Add line.</p>
              )}
              {lines.map((l) => (
                <div
                  key={l.key}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    alignItems: "flex-end",
                    marginBottom: "0.5rem",
                  }}
                >
                  <select
                    value={l.ingredientId}
                    onChange={(e) => updateLine(l.key, { ingredientId: e.target.value })}
                    style={{ ...inputStyle, minWidth: "180px" }}
                  >
                    <option value="">—</option>
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit})
                      </option>
                    ))}
                  </select>
                  <label style={{ marginBottom: 0 }}>
                    Amount
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={l.amount}
                      onChange={(e) => updateLine(l.key, { amount: e.target.value })}
                      style={{ ...inputStyle, width: "100px" }}
                    />
                  </label>
                  <label style={{ marginBottom: 0 }}>
                    Waste 0–1
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={l.wasteFactor}
                      onChange={(e) => updateLine(l.key, { wasteFactor: e.target.value })}
                      style={{ ...inputStyle, width: "80px" }}
                    />
                  </label>
                  <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => removeLine(l.key)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {computed && (
              <div className="admin-alert-box info" style={{ fontSize: "0.9rem" }}>
                <strong>Computed:</strong> ingredients {formatGhs(computed.ingredientsCents)} + labor{" "}
                {formatGhs(computed.laborCents)} + overhead {formatGhs(computed.overheadCents)} = batch{" "}
                {formatGhs(computed.totalBatchCents)}
                → <strong>unit {formatGhs(computed.unitCostCents)}</strong>
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={recipeSaving}>
                {recipeSaving ? "Saving recipe…" : hasRecipe ? "Update recipe" : "Create recipe"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={applyComputedCost}
                disabled={!computed}
              >
                Apply computed unit cost to Est. cost
              </button>
              <button type="button" className="admin-btn admin-btn-sm" onClick={() => loadRecipe()} disabled={recipeSaving}>
                Reload
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
