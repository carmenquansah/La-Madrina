import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  purchaseQuantity: z.number().positive(),
  purchaseCostCents: z.number().int().min(0),
});

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const list = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  const data = list.map((i) => ({
    ...i,
    costPerUnitCents: i.purchaseQuantity > 0 ? i.purchaseCostCents / i.purchaseQuantity : 0,
  }));
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid input", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const ing = await prisma.ingredient.create({ data: parsed.data });
  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "ingredient.create",
    resource: "ingredient",
    resourceId: ing.id,
    details: { name: ing.name },
  });
  return NextResponse.json({
    ok: true,
    data: {
      ...ing,
      costPerUnitCents: ing.purchaseQuantity > 0 ? ing.purchaseCostCents / ing.purchaseQuantity : 0,
    },
  });
}
