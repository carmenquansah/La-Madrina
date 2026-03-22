import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { COOKIE_NAME } from "@/lib/auth-types";
import { getDashboardAdminFromCookie } from "@/lib/admin-session-server";
import { AdminLogoutButton } from "../AdminLogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await getDashboardAdminFromCookie(token);
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-app-shell">
      <header className="admin-topbar">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem 1.25rem" }}>
          <Link href="/admin" className="admin-brand">
            La Madrina
          </Link>
          <nav className="admin-nav" aria-label="Admin">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/admin/expenses">Expenses</Link>
            <Link href="/admin/ingredients">Ingredients</Link>
            <Link href="/admin/insights">Insights</Link>
            <Link href="/admin/audit">Audit</Link>
          </nav>
        </div>
        <span className="admin-user">
          {session.email}
          {" · "}
          <AdminLogoutButton />
        </span>
      </header>
      {children}
    </div>
  );
}
