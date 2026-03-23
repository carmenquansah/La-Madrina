"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
          confirmPassword: confirm,
        }),
      });
      const j = await res.json();
      setMessage({ ok: j.ok, text: j.message });
      if (j.ok) {
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch {
      setMessage({ ok: false, text: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page-shell">
      <div className="admin-section-title">
        <h1>Settings</h1>
      </div>

      <div className="settings-card">
        <h2 className="settings-section-heading">Change password</h2>
        <p className="settings-section-lead">
          Choose a strong password of at least 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-field">
            <label className="settings-label" htmlFor="s-current">
              Current password
            </label>
            <input
              id="s-current"
              type="password"
              required
              autoComplete="current-password"
              className="settings-input"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label" htmlFor="s-new">
              New password
            </label>
            <input
              id="s-new"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="settings-input"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label" htmlFor="s-confirm">
              Confirm new password
            </label>
            <input
              id="s-confirm"
              type="password"
              required
              autoComplete="new-password"
              className="settings-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {message && (
            <p
              className={message.ok ? "settings-msg-ok" : "settings-msg-err"}
              role="alert"
            >
              {message.text}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
