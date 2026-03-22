"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";

type AuditRow = {
  id: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await adminFetch("/api/admin/audit-log?limit=100");
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.message || "Failed to load audit log");
          return;
        }
        if (!cancelled) setRows(json.data ?? []);
      } catch {
        if (!cancelled) setError("Failed to load audit log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="admin-page">
        <h1>Audit log</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin-page">
        <h1>Audit log</h1>
        <p style={{ color: "#b91c1c" }}>{error}</p>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <h1>Audit log</h1>
      <p className="page-desc">Recent admin actions (newest first). Details are summaries only — no full customer data.</p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Resource ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>No audit entries yet.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.adminEmail}</td>
                  <td>{r.action}</td>
                  <td>{r.resource}</td>
                  <td style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{r.resourceId ?? "—"}</td>
                  <td style={{ fontSize: "0.85rem", maxWidth: "320px", wordBreak: "break-word" }}>
                    {r.details ? r.details : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
