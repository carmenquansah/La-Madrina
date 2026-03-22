import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().max(2048).optional().nullable(),
  basePriceCents: z.number().int().min(0),
  estimatedCostCents: z.number().int().min(0).optional().nullable(),
  category: z.string().min(1),
  /** catalog: fixed list price. quote: price set per order from suggestion + owner. */
  pricingMode: z.enum(["catalog", "quote"]).optional().default("catalog"),
  active: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ ok: true, data: products });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }
  const product = await prisma.product.create({ data: parsed.data });
  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "product.create",
    resource: "product",
    resourceId: product.id,
    details: { name: product.name, category: product.category },
  });
  return NextResponse.json({ ok: true, data: product });
}
