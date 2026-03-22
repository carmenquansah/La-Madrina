import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AdminContext = {
  adminId: string;
  email: string;
};

/**
 * Use in admin API routes: returns admin context or 401 response.
 * Example: const auth = await requireAdmin(request); if (auth instanceof NextResponse) return auth;
 */
export async function requireAdmin(request: Request): Promise<AdminContext | NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminId },
    select: { id: true, email: true, active: true },
  });
  if (!admin || admin.active === false) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  return { adminId: admin.id, email: admin.email };
}
