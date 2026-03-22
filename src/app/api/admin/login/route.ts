import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, sessionCookieValue } from "@/lib/auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getClientIp,
  recordLoginFailure,
} from "@/lib/login-rate-limit";
import { logRouteError } from "@/lib/safe-server-log";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;
    const ip = getClientIp(request);
    const emailKey = email.toLowerCase();

    const limit = checkLoginRateLimit(ip, emailKey);
    if (!limit.ok) {
      const res = NextResponse.json(
        {
          ok: false,
          message: "Too many login attempts. Try again later.",
          retryAfterSeconds: limit.retryAfterSec,
        },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(limit.retryAfterSec));
      return res;
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      recordLoginFailure(ip, emailKey);
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (admin.active === false) {
      recordLoginFailure(ip, emailKey);
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      recordLoginFailure(ip, emailKey);
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    clearLoginRateLimit(ip, emailKey);
    const token = createSession(admin.id, admin.email);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", sessionCookieValue(token));
    return res;
  } catch (e) {
    logRouteError("POST /api/admin/login", e);
    return NextResponse.json(
      { ok: false, message: "Login failed" },
      { status: 500 }
    );
  }
}
