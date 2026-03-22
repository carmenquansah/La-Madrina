"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
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
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="font-display" style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.5rem" }}>
          Staff
        </p>
        <h1>Sign in</h1>
        <p className="auth-lead">Manage products, orders, costs, and insights.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label htmlFor="email" className="auth-label">
              Email
            </label>
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
            <label htmlFor="password" className="auth-label">
              Password
            </label>
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
  );
}
