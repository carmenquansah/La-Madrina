import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";

const updateSchema = z.object({
  date: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  amountCents: z.number().int().min(0).optional(),
  description: z.string().optional().nullable(),
  isFixed: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, data: expense });
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
  const data: { date?: Date; category?: string; amountCents?: number; description?: string | null; isFixed?: boolean } = {};
  if (parsed.data.date != null) data.date = new Date(parsed.data.date);
  if (parsed.data.category != null) data.category = parsed.data.category;
  if (parsed.data.amountCents != null) data.amountCents = parsed.data.amountCents;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.isFixed !== undefined) data.isFixed = parsed.data.isFixed;
  const expense = await prisma.expense.update({
    where: { id },
    data,
  });
  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "expense.update",
    resource: "expense",
    resourceId: id,
    details: { fields: Object.keys(data) },
  });
  return NextResponse.json({ ok: true, data: expense });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await prisma.expense.delete({ where: { id } });
  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "expense.delete",
    resource: "expense",
    resourceId: id,
  });
  return NextResponse.json({ ok: true });
}
