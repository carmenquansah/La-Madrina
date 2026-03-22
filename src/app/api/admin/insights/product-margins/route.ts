import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { currentPeriodRange } from "@/lib/business-calendar";
import { clampInsightsDaysParam } from "@/lib/insights-query";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const days = clampInsightsDaysParam(searchParams.get("days"));
  const { since, untilExclusive } = currentPeriodRange(days);

  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      basePriceCents: true,
      estimatedCostCents: true,
      category: true,
    },
  });

  const completedOrderIds = (
    await prisma.order.findMany({
      where: { status: "completed", createdAt: { gte: since, lt: untilExclusive } },
      select: { id: true },
    })
  ).map((o) => o.id);

  const items =
    completedOrderIds.length > 0
      ? await prisma.orderItem.findMany({
          where: { orderId: { in: completedOrderIds } },
          select: { productId: true, quantity: true, unitPriceCents: true },
        })
      : [];

  const unitsSold: Record<string, number> = {};
  const revenueByProduct: Record<string, number> = {};
  for (const item of items) {
    unitsSold[item.productId] = (unitsSold[item.productId] ?? 0) + item.quantity;
    revenueByProduct[item.productId] =
      (revenueByProduct[item.productId] ?? 0) + item.quantity * item.unitPriceCents;
  }

  const productMargins = products.map((p) => {
    const cost = p.estimatedCostCents ?? 0;
    const marginCents = p.basePriceCents - cost;
    const marginPct = p.basePriceCents > 0 ? Math.round((marginCents / p.basePriceCents) * 100) : 0;
    return {
      productId: p.id,
      name: p.name,
      category: p.category,
      basePriceCents: p.basePriceCents,
      estimatedCostCents: p.estimatedCostCents,
      marginCents,
      marginPct,
      unitsSold: unitsSold[p.id] ?? 0,
      revenueCents: revenueByProduct[p.id] ?? 0,
    };
  });

  return NextResponse.json({
    ok: true,
    data: { periodDays: days, productMargins },
  });
}
