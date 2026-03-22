import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  purchaseQuantity: z.number().positive().optional(),
  purchaseCostCents: z.number().int().min(0).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const ing = await prisma.ingredient.findUnique({ where: { id } });
  if (!ing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    data: {
      ...ing,
      costPerUnitCents: ing.purchaseQuantity > 0 ? ing.purchaseCostCents / ing.purchaseQuantity : 0,
    },
  });
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
  const ing = await prisma.ingredient.update({ where: { id }, data: parsed.data });
  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "ingredient.update",
    resource: "ingredient",
    resourceId: id,
    details: { fields: Object.keys(parsed.data) },
  });
  return NextResponse.json({
    ok: true,
    data: {
      ...ing,
      costPerUnitCents: ing.purchaseQuantity > 0 ? ing.purchaseCostCents / ing.purchaseQuantity : 0,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const used = await prisma.productIngredient.count({ where: { ingredientId: id } });
  if (used > 0) {
    return NextResponse.json(
      { ok: false, message: "Ingredient is used in a recipe; remove it from recipes first." },
      { status: 400 }
    );
  }
  await prisma.ingredient.delete({ where: { id } });
  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "ingredient.delete",
    resource: "ingredient",
    resourceId: id,
  });
  return NextResponse.json({ ok: true });
}
