"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const sec = typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : undefined;
          setError(
            sec != null
              ? `${data.message || "Too many attempts."} Retry in about ${sec}s.`
              : data.message || "Too many login attempts. Try again later."
          );
        } else {
          setError(data.message || "Login failed");
        }
        return;
      }
      // Full page navigation ensures the new session cookie is sent on the
      // very next request — router.push() can race the cookie commit in App Router.
      const params = new URLSearchParams(window.location.search);
      const dest = params.get("from") || "/admin";
      window.location.href = dest;
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      {/* Brand panel */}
      <div className="auth-brand-panel" aria-hidden="true">
        <div className="auth-brand-inner">
          <img
            src="/images/logo/La%20Madrina%20logo%20white.png"
            alt="La Madrina"
            className="auth-brand-logo"
            height={56}
          />
          <p className="auth-brand-tagline">
            Baked before dawn.<br />Crafted with purpose.
          </p>
          <ul className="auth-brand-features">
            <li>Orders &amp; custom requests</li>
            <li>Revenue &amp; expense tracking</li>
            <li>Product &amp; inventory management</li>
            <li>Business insights &amp; analytics</li>
          </ul>
        </div>
        <p className="auth-brand-footer">La Madrina Bakery · Accra, Ghana</p>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <p className="auth-eyebrow">Staff portal</p>
          <h1>Sign in</h1>
          <p className="auth-lead">Manage products, orders, costs, and insights.</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <div>
              <label htmlFor="email" className="auth-label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="auth-input"
              />
            </div>
            <div>
              <label htmlFor="password" className="auth-label">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="auth-input"
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", marginTop: "0.25rem" }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="auth-footer">
            <Link href="/">← Back to site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
