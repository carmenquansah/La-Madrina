"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatGhs } from "@/lib/format-money";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  purchaseQuantity: number;
  purchaseCostCents: number;
  costPerUnitCents: number;
};

export default function AdminIngredientsPage() {
  const [list, setList] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("lb");
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editCost, setEditCost] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminFetch("/api/admin/ingredients");
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Failed to load");
      setList([]);
    } else {
      setList(json.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(purchaseQty);
    const costDollars = parseFloat(purchaseCost);
    if (!name.trim() || !unit.trim() || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(costDollars) || costDollars < 0) {
      setError("Fill all fields with valid numbers.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await adminFetch("/api/admin/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        unit: unit.trim(),
        purchaseQuantity: qty,
        purchaseCostCents: Math.round(costDollars * 100),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.message || "Save failed");
      return;
    }
    setName("");
    setPurchaseQty("1");
    setPurchaseCost("");
    await load();
  }

  function startEdit(i: Ingredient) {
    setEditingId(i.id);
    setEditName(i.name);
    setEditUnit(i.unit);
    setEditQty(String(i.purchaseQuantity));
    setEditCost(String((i.purchaseCostCents / 100).toFixed(2)));
  }

  async function saveEdit() {
    if (!editingId) return;
    const qty = parseFloat(editQty);
    const costDollars = parseFloat(editCost);
    if (!editName.trim() || !editUnit.trim() || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(costDollars) || costDollars < 0) {
      setError("Invalid edit values.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await adminFetch(`/api/admin/ingredients/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        unit: editUnit.trim(),
        purchaseQuantity: qty,
        purchaseCostCents: Math.round(costDollars * 100),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.message || "Update failed");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this ingredient?")) return;
    const res = await adminFetch(`/api/admin/ingredients/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Ingredients</h1>
          <p className="admin-page-subtitle">
            Purchase packs and cost per recipe unit — used in product recipes.{" "}
            <Link href="/admin/insights">Economics &amp; pricing</Link> in Insights.
          </p>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <section className="admin-card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="admin-card-title">Add ingredient</h2>
        <form onSubmit={handleCreate} className="admin-form-grid">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Flour" />
          </label>
          <label>
            Unit (for recipe amounts)
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="lb, oz, each" />
          </label>
          <label>
            Purchase quantity
            <input
              type="number"
              step="any"
              min="0.0001"
              value={purchaseQty}
              onChange={(e) => setPurchaseQty(e.target.value)}
              placeholder="25"
            />
          </label>
          <label>
            Purchase cost (GHS)
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
              placeholder="12.99"
            />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">All ingredients</h2>
        {loading ? (
          <p>Loading…</p>
        ) : list.length === 0 ? (
          <p>No ingredients yet. Add your first pack above.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Pack</th>
                  <th>Pack cost</th>
                  <th>Cost / unit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) =>
                  editingId === i.id ? (
                    <tr key={i.id}>
                      <td>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </td>
                      <td>
                        <input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
                      </td>
                      <td>
                        <input type="number" step="any" value={editQty} onChange={(e) => setEditQty(e.target.value)} />
                      </td>
                      <td>
                        <input type="number" step="0.01" value={editCost} onChange={(e) => setEditCost(e.target.value)} />
                      </td>
                      <td>—</td>
                      <td>
                        <button type="button" className="admin-btn admin-btn-sm" onClick={saveEdit} disabled={saving}>
                          Save
                        </button>
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td>{i.unit}</td>
                      <td>
                        {i.purchaseQuantity} {i.unit}
                      </td>
                      <td>{formatGhs(i.purchaseCostCents)}</td>
                      <td>{formatGhs(i.costPerUnitCents)}</td>
                      <td>
                        <button type="button" className="admin-btn admin-btn-sm" onClick={() => startEdit(i)}>
                          Edit
                        </button>
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => remove(i.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
