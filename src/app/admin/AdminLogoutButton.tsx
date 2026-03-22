"use client";

export function AdminLogoutButton() {
  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    window.location.href = "/admin/login";
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        background: "none",
        border: "none",
        color: "var(--accent)",
        cursor: "pointer",
        fontSize: "inherit",
        padding: 0,
      }}
    >
      Logout
    </button>
  );
}
