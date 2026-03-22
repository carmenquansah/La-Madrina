import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { adminCreateOrderSchema, createAdminOrder } from "@/lib/admin-order-create";
import { logRouteError } from "@/lib/safe-server-log";
import type { Prisma } from "@prisma/client";

const UNSET = "__unset__";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const channel = searchParams.get("channel") || undefined;
  const orderType = searchParams.get("orderType") || undefined;
  const qRaw = searchParams.get("q")?.trim() ?? "";

  const and: Prisma.OrderWhereInput[] = [];
  if (status) and.push({ status });
  if (channel === UNSET) and.push({ channel: null });
  else if (channel) and.push({ channel });
  if (orderType === UNSET) and.push({ orderType: null });
  else if (orderType) and.push({ orderType });
  if (qRaw.length >= 1) {
    and.push({
      OR: [
        { customerName: { contains: qRaw, mode: "insensitive" } },
        { customerEmail: { contains: qRaw, mode: "insensitive" } },
        { customerPhone: { contains: qRaw, mode: "insensitive" } },
      ],
    });
  }

  const orders = await prisma.order.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json({ ok: true, data: orders });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminCreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid order", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await createAdminOrder(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    await writeAdminAudit({
      adminId: auth.adminId,
      adminEmail: auth.email,
      action: "order.create",
      resource: "order",
      resourceId: result.orderId,
      details: {
        channel: parsed.data.channel,
        lineCount: parsed.data.items.length,
        totalCents: "computed server-side",
      },
    });
    return NextResponse.json({ ok: true, data: { id: result.orderId } });
  } catch (e) {
    logRouteError("POST /api/admin/orders", e);
    return NextResponse.json({ ok: false, message: "Could not create order" }, { status: 500 });
  }
}
