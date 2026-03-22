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

  const events = await prisma.shopAnalyticsEvent.findMany({
    where: { createdAt: { gte: since, lt: untilExclusive } },
    select: { eventType: true, productId: true },
  });

  const countsByType: Record<string, number> = {};
  const addToCartByProduct: Record<string, number> = {};

  for (const e of events) {
    countsByType[e.eventType] = (countsByType[e.eventType] ?? 0) + 1;
    if (e.eventType === "add_to_cart" && e.productId) {
      addToCartByProduct[e.productId] = (addToCartByProduct[e.productId] ?? 0) + 1;
    }
  }

  const topAddToCart = Object.entries(addToCartByProduct)
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const ids = topAddToCart.map((t) => t.productId);
  const products =
    ids.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];
  const nameById = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const topAddToCartNamed = topAddToCart.map((t) => ({
    ...t,
    name: nameById[t.productId] ?? "(removed)",
  }));

  return NextResponse.json({
    ok: true,
    data: {
      periodDays: days,
      totalEvents: events.length,
      countsByType,
      topAddToCart: topAddToCartNamed,
    },
  });
}
