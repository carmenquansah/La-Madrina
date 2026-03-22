import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { isPrismaReplicaSetError, patchOrderNative } from "@/lib/mongo-order-patch";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  channel: z.enum(["web", "walk-in", "phone", "delivery-app", "wholesale"]).optional().nullable(),
  orderType: z.enum(["pickup", "delivery"]).optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });
  if (!order) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, data: order });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid input" }, { status: 400 });
  }
  const data: { status?: string; channel?: string | null; orderType?: string | null } = {};
  if (parsed.data.status != null) data.status = parsed.data.status;
  if (parsed.data.channel !== undefined) data.channel = parsed.data.channel;
  if (parsed.data.orderType !== undefined) data.orderType = parsed.data.orderType;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, message: "No fields to update" }, { status: 400 });
  }

  const before = await prisma.order.findUnique({
    where: { id },
    select: { status: true, channel: true, orderType: true },
  });
  if (!before) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const prior = before;

  function buildOrderChangeDetails() {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (data.status !== undefined && data.status !== prior.status) {
      changes.status = { from: prior.status, to: data.status };
    }
    if (data.channel !== undefined && data.channel !== prior.channel) {
      changes.channel = { from: prior.channel, to: data.channel };
    }
    if (data.orderType !== undefined && data.orderType !== prior.orderType) {
      changes.orderType = { from: prior.orderType, to: data.orderType };
    }
    return Object.keys(changes).length > 0 ? { changes } : { note: "no_op" };
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data,
    });
    await writeAdminAudit({
      adminId: auth.adminId,
      adminEmail: auth.email,
      action: "order.update",
      resource: "order",
      resourceId: id,
      details: buildOrderChangeDetails(),
    });
    return NextResponse.json({ ok: true, data: order });
  } catch (e) {
    if (!isPrismaReplicaSetError(e)) throw e;
    const { matched } = await patchOrderNative(id, data);
    if (!matched) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
    if (!order) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }
    await writeAdminAudit({
      adminId: auth.adminId,
      adminEmail: auth.email,
      action: "order.update",
      resource: "order",
      resourceId: id,
      details: buildOrderChangeDetails(),
    });
    return NextResponse.json({ ok: true, data: order });
  }
}
