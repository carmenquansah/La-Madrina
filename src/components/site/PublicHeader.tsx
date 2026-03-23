import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth-types";
import { getDashboardAdminFromCookie } from "@/lib/admin-session-server";

export async function PublicHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await getDashboardAdminFromCookie(token);

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Link href="/" className="public-logo">
          <span className="brand-wordmark-wrap">
            <img
              src="/images/logo/la%20madrina%20logo%20black.png"
              alt="La Madrina"
              className="brand-wordmark brand-wordmark-header"
              height={40}
            />
          </span>
        </Link>
        <nav className="public-nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/about">About</Link>
          <Link href="/track">Track order</Link>
          {session && (
            <Link href="/admin" className="public-nav-admin">
              Admin ↗
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
