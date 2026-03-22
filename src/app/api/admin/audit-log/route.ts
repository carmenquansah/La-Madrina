import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const raw = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(raw) ? raw : 50));

  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      adminEmail: true,
      action: true,
      resource: true,
      resourceId: true,
      details: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, data: rows });
}
