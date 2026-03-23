import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/auth-types";
import { verifySessionEdge } from "@/lib/auth-session-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(COOKIE_NAME)?.value;
  const token = raw ? decodeURIComponent(raw) : "";
  const session = token ? await verifySessionEdge(token) : null;
  if (!session) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("from", pathname);
    const res = NextResponse.redirect(login);
    // Clear any stale / invalid cookie so the browser doesn't keep sending it
    if (raw) {
      res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
