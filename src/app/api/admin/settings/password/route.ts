import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/auth-types";
import { getDashboardAdminFromCookie } from "@/lib/admin-session-server";
import { logRouteError } from "@/lib/safe-server-log";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await getDashboardAdminFromCookie(token);
    if (!session) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json({ ok: false, message: firstError }, { status: 400 });
    }

    const { currentPassword, newPassword, confirmPassword } = parsed.data;

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ ok: false, message: "Passwords do not match" }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.adminId },
      select: { id: true, passwordHash: true },
    });
    if (!admin) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) {
      return NextResponse.json({ ok: false, message: "Current password is incorrect" }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true, message: "Password updated successfully" });
  } catch (e) {
    logRouteError("POST /api/admin/settings/password", e);
    return NextResponse.json({ ok: false, message: "Something went wrong" }, { status: 500 });
  }
}
