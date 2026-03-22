import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().max(2048).optional().nullable(),
  basePriceCents: z.number().int().min(0).optional(),
  estimatedCostCents: z.number().int().min(0).optional().nullable(),
  category: z.string().min(1).optional(),
  pricingMode: z.enum(["catalog", "quote"]).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, data: product });
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
    return NextResponse.json({ ok: false, message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }
  const product = await prisma.product.update({
    where: { id },
    data: parsed.data,
  });
  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "product.update",
    resource: "product",
    resourceId: id,
    details: { fields: Object.keys(parsed.data) },
  });
  return NextResponse.json({ ok: true, data: product });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const del = await prisma.product.deleteMany({ where: { id } });
  if (del.count > 0) {
    await writeAdminAudit({
      adminId: auth.adminId,
      adminEmail: auth.email,
      action: "product.delete",
      resource: "product",
      resourceId: id,
    });
  }
  return NextResponse.json({ ok: true });
}
