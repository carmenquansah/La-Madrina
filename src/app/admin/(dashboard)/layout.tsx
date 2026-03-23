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
        <span className="admin-topbar-stripe" aria-hidden="true" />
        <div className="admin-topbar-inner">
          <Link href="/admin" className="admin-brand">
            <span className="brand-wordmark-wrap">
              <img
                src="/images/logo/la%20madrina%20logo%20black.png"
                alt="La Madrina"
                className="brand-wordmark brand-wordmark-admin"
                height={36}
              />
            </span>
          </Link>
          <nav className="admin-nav" aria-label="Admin">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/admin/orders/new" title="Record walk-in or phone order">
              New order
            </Link>
            <Link href="/admin/expenses">Expenses</Link>
            <Link href="/admin/ingredients">Ingredients</Link>
            <Link href="/admin/insights">Insights</Link>
            <Link href="/admin/audit">Audit</Link>
            <Link href="/admin/settings">Settings</Link>
            <span className="admin-nav-sep" aria-hidden="true" />
            <Link href="/" className="admin-nav-ext">Home ↗</Link>
            <Link href="/shop" className="admin-nav-ext">Shop ↗</Link>
          </nav>
        </div>
        <span className="admin-user admin-topbar-user">
          {session.email}
          {" · "}
          <AdminLogoutButton />
        </span>
      </header>
      {children}
    </div>
  );
}
