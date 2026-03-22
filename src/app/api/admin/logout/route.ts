import { NextResponse } from "next/server";
import { clearSessionCookieValue } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookieValue());
  return res;
}
