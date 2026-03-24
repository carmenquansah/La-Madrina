"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";

const CATEGORIES = ["bread", "pastries", "cakes", "custom", "other"];
const TARGET_MARGIN = 0.6; // 60% — suggested price = cost / (1 - margin)

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePriceCents: number;
  estimatedCostCents: number | null;
  category: string;
  pricingMode?: string | null;
  active: boolean;
};

type IngredientOption = {
  id: string;
  name: string;
  unit: string;
  costPerUnitCents: number;
};

type EconomicsConfig = {
  defaultLaborRateCentsPerHour: number;
  monthlyFixedCostsCents: number;
  estimatedBatchesPerMonth: number;
};

type RecipeLine = {
  key: string;
  ingredientId: string;
  amount: string;
  wasteFactor: string;
};

function newLineKey() {
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function computeLive(
  batchSize: string,
  laborMinutes: string,
  laborRateOverride: string,
  overheadOverride: string,
  lines: RecipeLine[],
  ingredients: IngredientOption[],
  config: EconomicsConfig
) {
  const bs = parseInt(batchSize, 10);
  const lm = parseFloat(laborMinutes);
  if (!Number.isFinite(bs) || bs < 1 || !Number.isFinite(lm) || lm < 0) return null;

  const laborRate =
    laborRateOverride.trim() !== "" && Number.isFinite(parseFloat(laborRateOverride))
      ? Math.round(parseFloat(laborRateOverride) * 100)
      : config.defaultLaborRateCentsPerHour;

  const overhead =
    overheadOverride.trim() !== "" && Number.isFinite(parseFloat(overheadOverride))
      ? Math.round(parseFloat(overheadOverride) * 100)
      : config.estimatedBatchesPerMonth > 0
      ? Math.round(config.monthlyFixedCostsCents / config.estimatedBatchesPerMonth)
      : 0;

  const laborCents = Math.round((lm / 60) * laborRate);
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  let ingredientsCents = 0;
  for (const l of lines) {
    if (!l.ingredientId) continue;
    const ing = ingMap.get(l.ingredientId);
    if (!ing) continue;
    const amt = parseFloat(l.amount);
    const waste = parseFloat(l.wasteFactor || "0");
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const effectiveAmt = amt * (1 + Math.max(0, isNaN(waste) ? 0 : waste));
    ingredientsCents += Math.round(effectiveAmt * ing.costPerUnitCents);
  }

  const totalBatchCents = ingredientsCents + laborCents + overhead;
  const unitCostCents = Math.round(totalBatchCents / bs);
  const suggestedPriceCents = unitCostCents > 0 ? Math.round(unitCostCents / (1 - TARGET_MARGIN)) : 0;

  return { ingredientsCents, laborCents, overheadCents: overhead, totalBatchCents, unitCostCents, suggestedPriceCents };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // ── Product form state ──────────────────────────────────────────
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePriceCents, setBasePriceCents] = useState("");
  const [estimatedCostCents, setEstimatedCostCents] = useState("");
  const [category, setCategory] = useState("bread");
  const [pricingMode, setPricingMode] = useState<"catalog" | "quote">("catalog");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [productError, setProductError] = useState("");
  const [productSaving, setProductSaving] = useState(false);

  // ── Recipe state ────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [econConfig, setEconConfig] = useState<EconomicsConfig>({
    defaultLaborRateCentsPerHour: 2000,
    monthlyFixedCostsCents: 500000,
    estimatedBatchesPerMonth: 200,
  });
  const [recipeLoading, setRecipeLoading] = useState(true);
  const [recipeError, setRecipeError] = useState("");
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [recipeDeleting, setRecipeDeleting] = useState(false);
  const [hasRecipe, setHasRecipe] = useState(false);
  const [savedComputed, setSavedComputed] = useState<{ unitCostCents: number } | null>(null);

  const [batchSize, setBatchSize] = useState("1");
  const [laborMinutes, setLaborMinutes] = useState("0");
  const [laborRateOverride, setLaborRateOverride] = useState("");
  const [overheadOverride, setOverheadOverride] = useState("");
  const [lines, setLines] = useState<RecipeLine[]>([]);

  // ── Live calculation (client-side, mirrors server formula) ───────
  const live = useMemo(
    () => computeLive(batchSize, laborMinutes, laborRateOverride, overheadOverride, lines, ingredients, econConfig),
    [batchSize, laborMinutes, laborRateOverride, overheadOverride, lines, ingredients, econConfig]
  );

  // ── Load recipe + ingredients ────────────────────────────────────
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
          ingRes.data.map((i: { id: string; name: string; unit: string; costPerUnitCents: number }) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
            costPerUnitCents: i.costPerUnitCents ?? 0,
          }))
        );
      }
      if (!recRes.ok) {
        setRecipeError(recRes.message || "Could not load recipe");
        return;
      }
      const data = recRes.data;
      if (data.economicsConfig) {
        setEconConfig({
          defaultLaborRateCentsPerHour: data.economicsConfig.defaultLaborRateCentsPerHour,
          monthlyFixedCostsCents: data.economicsConfig.monthlyFixedCostsCents,
          estimatedBatchesPerMonth: data.economicsConfig.estimatedBatchesPerMonth,
        });
      }
      if (data.recipe) {
        setHasRecipe(true);
        setBatchSize(String(data.recipe.batchSize));
        setLaborMinutes(String(data.recipe.laborMinutesPerBatch));
        setLaborRateOverride(
          data.recipe.laborRateCentsPerHour != null
            ? (data.recipe.laborRateCentsPerHour / 100).toFixed(2)
            : ""
        );
        setOverheadOverride(
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
        setSavedComputed(data.computed ?? null);
      } else {
        setHasRecipe(false);
        setBatchSize("1");
        setLaborMinutes("0");
        setLaborRateOverride("");
        setOverheadOverride("");
        setLines([]);
        setSavedComputed(null);
      }
    } catch {
      setRecipeError("Failed to load recipe");
    } finally {
      setRecipeLoading(false);
    }
  }, [id]);

  useEffect(() => {
    adminFetch(`/api/admin/products/${id}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => {
        const p = data.data as Product;
        setProduct(p);
        setName(p.name);
        setDescription(p.description || "");
        setBasePriceCents((p.basePriceCents / 100).toFixed(2));
        setEstimatedCostCents(p.estimatedCostCents != null ? (p.estimatedCostCents / 100).toFixed(2) : "");
        setCategory(p.category);
        setPricingMode(p.pricingMode === "quote" ? "quote" : "catalog");
        setActive(p.active);
        setImageUrl(p.imageUrl ?? "");
      })
      .catch(() => setProductError("Product not found"));
  }, [id]);

  useEffect(() => { loadRecipe(); }, [loadRecipe]);

  // ── Product save ─────────────────────────────────────────────────
  async function handleProductSave(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(basePriceCents || "0") * 100);
    const costCents = estimatedCostCents ? Math.round(parseFloat(estimatedCostCents) * 100) : null;
    if (isNaN(cents) || cents < 0) { setProductError("Enter a valid price"); return; }
    if (costCents !== null && (isNaN(costCents) || costCents < 0)) { setProductError("Enter a valid estimated cost or leave blank"); return; }
    setProductError("");
    setProductSaving(true);
    try {
      const res = await adminFetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, imageUrl: imageUrl.trim() || null, basePriceCents: cents, estimatedCostCents: costCents, category, pricingMode, active }),
      });
      const data = await res.json();
      if (!res.ok) { setProductError(data.message || "Failed to update"); return; }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setProductError("Something went wrong");
    } finally {
      setProductSaving(false);
    }
  }

  // ── Recipe line management ───────────────────────────────────────
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), ingredientId: ingredients[0]?.id ?? "", amount: "1", wasteFactor: "0" }]);
  }
  function updateLine(key: string, patch: Partial<RecipeLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  // ── Recipe save ──────────────────────────────────────────────────
  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault();
    const bs = parseInt(batchSize, 10);
    const laborMin = parseFloat(laborMinutes);
    if (!Number.isFinite(bs) || bs < 1 || !Number.isFinite(laborMin) || laborMin < 0) {
      setRecipeError("Batch size (≥1) and labor minutes (≥0) are required."); return;
    }
    const laborRateParsed = laborRateOverride.trim() === "" ? null : parseFloat(laborRateOverride);
    const overheadParsed = overheadOverride.trim() === "" ? null : parseFloat(overheadOverride);
    if (laborRateParsed !== null && (!Number.isFinite(laborRateParsed) || laborRateParsed < 0)) {
      setRecipeError("Invalid labor rate override."); return;
    }
    if (overheadParsed !== null && (!Number.isFinite(overheadParsed) || overheadParsed < 0)) {
      setRecipeError("Invalid overhead override."); return;
    }
    const payloadLines = [];
    for (const l of lines) {
      if (!l.ingredientId) continue;
      const amt = parseFloat(l.amount);
      const waste = parseFloat(l.wasteFactor || "0");
      if (!Number.isFinite(amt) || amt <= 0) { setRecipeError("Each line needs a positive amount."); return; }
      if (!Number.isFinite(waste) || waste < 0 || waste > 1) { setRecipeError("Waste factor must be 0–1."); return; }
      payloadLines.push({ ingredientId: l.ingredientId, amount: amt, wasteFactor: waste });
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
          laborRateCentsPerHour: laborRateParsed === null ? null : Math.round(laborRateParsed * 100),
          overheadCentsPerBatch: overheadParsed === null ? null : Math.round(overheadParsed * 100),
          lines: payloadLines,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setRecipeError(json.message || "Recipe save failed"); return; }
      setHasRecipe(true);
      setSavedComputed(json.data.computed ?? null);
    } catch {
      setRecipeError("Recipe save failed");
    } finally {
      setRecipeSaving(false);
    }
  }

  // ── Recipe delete ────────────────────────────────────────────────
  async function deleteRecipe() {
    if (!confirm("Remove this recipe? The product's estimated cost will be cleared.")) return;
    setRecipeDeleting(true);
    setRecipeError("");
    try {
      const res = await adminFetch(`/api/admin/products/${id}/recipe`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); setRecipeError(j.message || "Delete failed"); return; }
      setHasRecipe(false);
      setBatchSize("1");
      setLaborMinutes("0");
      setLaborRateOverride("");
      setOverheadOverride("");
      setLines([]);
      setSavedComputed(null);
      setEstimatedCostCents("");
    } catch {
      setRecipeError("Delete failed");
    } finally {
      setRecipeDeleting(false);
    }
  }

  function applyComputedCost() {
    if (!live) return;
    setEstimatedCostCents((live.unitCostCents / 100).toFixed(2));
  }

  const listPrice = parseFloat(basePriceCents) * 100;
  const belowCost = live && !isNaN(listPrice) && listPrice > 0 && listPrice < live.unitCostCents;

  if (productError && !product) return <p style={{ color: "#c00", padding: "2rem" }}>{productError}</p>;
  if (!product) return <p style={{ padding: "2rem" }}>Loading…</p>;

  return (
    <main className="admin-page-shell">
      <div className="admin-section-title">
        <h1>Edit product</h1>
      </div>
      <p className="admin-back-link"><Link href="/admin/products">← Products</Link></p>

      {/* ── Product details ── */}
      <section className="recipe-card">
        <h2 className="recipe-section-heading">Product details</h2>
        <form onSubmit={handleProductSave} className="recipe-product-form">
          <div className="recipe-field">
            <label className="recipe-label" htmlFor="p-name">Name</label>
            <input id="p-name" className="recipe-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="recipe-field">
            <label className="recipe-label" htmlFor="p-desc">Description (optional)</label>
            <textarea id="p-desc" className="recipe-input recipe-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="recipe-field">
            <label className="recipe-label" htmlFor="p-img">Photo URL</label>
            <input id="p-img" type="url" className="recipe-input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… (HTTPS image)" />
            <p className="recipe-hint">Shown in the public shop. Leave blank to use a category placeholder.</p>
          </div>
          <div className="recipe-row-2">
            <div className="recipe-field">
              <label className="recipe-label" htmlFor="p-pricing">Pricing mode</label>
              <select id="p-pricing" className="recipe-input" value={pricingMode} onChange={(e) => setPricingMode(e.target.value as "catalog" | "quote")}>
                <option value="catalog">Standard — list price</option>
                <option value="quote">Quote-based — price set per order</option>
              </select>
            </div>
            <div className="recipe-field">
              <label className="recipe-label" htmlFor="p-cat">Category</label>
              <select id="p-cat" className="recipe-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="recipe-row-2">
            <div className="recipe-field">
              <label className="recipe-label" htmlFor="p-price">List price (GHS)</label>
              <input id="p-price" type="number" step="0.01" min="0" className={`recipe-input${belowCost ? " recipe-input-warn" : ""}`} value={basePriceCents} onChange={(e) => setBasePriceCents(e.target.value)} required />
              {belowCost && <p className="recipe-warn-text">⚠ Selling below calculated cost</p>}
            </div>
            <div className="recipe-field">
              <label className="recipe-label" htmlFor="p-cost">Est. cost (GHS) — manual / stored</label>
              <input id="p-cost" type="number" step="0.01" min="0" className="recipe-input" value={estimatedCostCents} onChange={(e) => setEstimatedCostCents(e.target.value)} placeholder="from recipe or manual" />
            </div>
          </div>
          <div className="recipe-checkbox-row">
            <input id="p-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <label htmlFor="p-active">Active — visible in shop</label>
          </div>
          {productError && <p className="recipe-error" role="alert">{productError}</p>}
          <button type="submit" className="btn btn-primary" disabled={productSaving} style={{ alignSelf: "flex-start" }}>
            {productSaving ? "Saving…" : "Save product"}
          </button>
        </form>
      </section>

      {/* ── Recipe & cost calculator ── */}
      <section className="recipe-card" style={{ marginTop: "1.5rem" }}>
        <div className="recipe-section-header">
          <h2 className="recipe-section-heading">Recipe &amp; cost calculator</h2>
          {hasRecipe && (
            <button type="button" className="recipe-delete-btn" onClick={deleteRecipe} disabled={recipeDeleting}>
              {recipeDeleting ? "Removing…" : "Remove recipe"}
            </button>
          )}
        </div>
        <p className="recipe-section-lead">
          Define how many units a batch makes, how long it takes, and which ingredients go in.
          The cost panel updates live as you type — no need to save first.
          Go to <Link href="/admin/ingredients" className="recipe-link">Ingredients</Link> to add or update ingredient prices.
        </p>

        {recipeLoading && <p className="recipe-hint">Loading…</p>}
        {recipeError && <p className="recipe-error" role="alert">{recipeError}</p>}

        {!recipeLoading && (
          <div className="recipe-builder-layout">
            {/* Left: form */}
            <form onSubmit={saveRecipe} className="recipe-form-col">

              <div className="recipe-header-fields">
                <div className="recipe-field">
                  <label className="recipe-label" htmlFor="r-batch">Batch size (units)</label>
                  <input id="r-batch" type="number" min={1} step={1} className="recipe-input" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
                </div>
                <div className="recipe-field">
                  <label className="recipe-label" htmlFor="r-labor">Labor min / batch</label>
                  <input id="r-labor" type="number" min={0} step="any" className="recipe-input" value={laborMinutes} onChange={(e) => setLaborMinutes(e.target.value)} />
                </div>
                <div className="recipe-field">
                  <label className="recipe-label" htmlFor="r-lrate">Labor GHS/hr <span className="recipe-optional">(optional override)</span></label>
                  <input id="r-lrate" type="number" step="0.01" min={0} className="recipe-input" value={laborRateOverride} onChange={(e) => setLaborRateOverride(e.target.value)} placeholder="use global default" />
                </div>
                <div className="recipe-field">
                  <label className="recipe-label" htmlFor="r-over">Overhead GHS/batch <span className="recipe-optional">(optional override)</span></label>
                  <input id="r-over" type="number" step="0.01" min={0} className="recipe-input" value={overheadOverride} onChange={(e) => setOverheadOverride(e.target.value)} placeholder="from economics config" />
                </div>
              </div>

              {/* Ingredient lines */}
              <div className="recipe-lines-section">
                <div className="recipe-lines-header">
                  <span className="recipe-label">Ingredients per batch</span>
                  <button type="button" className="recipe-add-btn" onClick={addLine} disabled={ingredients.length === 0}>
                    + Add ingredient
                  </button>
                </div>

                {ingredients.length === 0 && (
                  <p className="recipe-hint"><Link href="/admin/ingredients">Add ingredients to the catalog first →</Link></p>
                )}
                {lines.length === 0 && ingredients.length > 0 && (
                  <p className="recipe-hint">No ingredients yet — click Add ingredient.</p>
                )}

                {lines.length > 0 && (
                  <div className="recipe-lines-table">
                    <div className="recipe-lines-thead">
                      <span>Ingredient</span>
                      <span>Amount</span>
                      <span>Waste 0–1</span>
                      <span></span>
                    </div>
                    {lines.map((l) => {
                      const ing = ingredients.find((i) => i.id === l.ingredientId);
                      const amt = parseFloat(l.amount);
                      const waste = parseFloat(l.wasteFactor || "0");
                      const lineCost = ing && Number.isFinite(amt) && amt > 0
                        ? Math.round(amt * (1 + Math.max(0, isNaN(waste) ? 0 : waste)) * ing.costPerUnitCents)
                        : null;
                      return (
                        <div key={l.key} className="recipe-line-row">
                          <select
                            className="recipe-input"
                            value={l.ingredientId}
                            onChange={(e) => updateLine(l.key, { ingredientId: e.target.value })}
                          >
                            <option value="">— select —</option>
                            {ingredients.map((i) => (
                              <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                            ))}
                          </select>
                          <input
                            type="number" step="any" min="0.0001"
                            className="recipe-input"
                            value={l.amount}
                            onChange={(e) => updateLine(l.key, { amount: e.target.value })}
                          />
                          <input
                            type="number" step="0.01" min="0" max="1"
                            className="recipe-input"
                            value={l.wasteFactor}
                            onChange={(e) => updateLine(l.key, { wasteFactor: e.target.value })}
                          />
                          <div className="recipe-line-right">
                            {lineCost !== null && (
                              <span className="recipe-line-cost">{formatGhs(lineCost)}</span>
                            )}
                            <button type="button" className="recipe-remove-btn" onClick={() => removeLine(l.key)}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="recipe-actions">
                <button type="submit" className="btn btn-primary" disabled={recipeSaving}>
                  {recipeSaving ? "Saving…" : hasRecipe ? "Update recipe" : "Save recipe"}
                </button>
                <button type="button" className="btn btn-primary" onClick={applyComputedCost} disabled={!live} style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                  Apply cost to Est. cost ↑
                </button>
              </div>
            </form>

            {/* Right: live cost panel */}
            <div className="recipe-cost-panel">
              <p className="recipe-cost-panel-title">Cost breakdown</p>
              <p className="recipe-cost-panel-note">Updates as you type — save to persist.</p>

              {!live ? (
                <p className="recipe-hint" style={{ marginTop: "1rem" }}>Fill in batch size and at least one ingredient to see costs.</p>
              ) : (
                <>
                  <div className="recipe-cost-rows">
                    <div className="recipe-cost-row">
                      <span>Ingredients</span>
                      <span>{formatGhs(live.ingredientsCents)}</span>
                    </div>
                    <div className="recipe-cost-row">
                      <span>Labour</span>
                      <span>{formatGhs(live.laborCents)}</span>
                    </div>
                    <div className="recipe-cost-row">
                      <span>Overhead</span>
                      <span>{formatGhs(live.overheadCents)}</span>
                    </div>
                    <div className="recipe-cost-row recipe-cost-batch-total">
                      <span>Batch total ({batchSize} units)</span>
                      <span>{formatGhs(live.totalBatchCents)}</span>
                    </div>
                  </div>

                  <div className="recipe-cost-unit">
                    <p className="recipe-cost-unit-label">Cost per unit</p>
                    <p className="recipe-cost-unit-value">{formatGhs(live.unitCostCents)}</p>
                  </div>

                  <div className="recipe-cost-suggested">
                    <p className="recipe-cost-suggested-label">Suggested price <span className="recipe-optional">(at {TARGET_MARGIN * 100}% margin)</span></p>
                    <p className="recipe-cost-suggested-value">{formatGhs(live.suggestedPriceCents)}</p>
                  </div>

                  {!isNaN(listPrice) && listPrice > 0 && (
                    <div className={`recipe-cost-compare ${belowCost ? "recipe-cost-compare-warn" : "recipe-cost-compare-ok"}`}>
                      <span>Your list price</span>
                      <span>{formatGhs(listPrice)}</span>
                    </div>
                  )}

                  {savedComputed && (
                    <p className="recipe-cost-saved-note">
                      Last saved unit cost: {formatGhs(savedComputed.unitCostCents)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
