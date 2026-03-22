import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { insertShopAnalyticsEvent } from "@/lib/shop-analytics-mongo";
import { logRouteError } from "@/lib/safe-server-log";

const bodySchema = z.object({
  eventType: z.enum(["shop_view", "product_view", "add_to_cart", "begin_checkout"]),
  productId: z.string().optional(),
});

/**
 * Public endpoint: records anonymous funnel events. Validate productId when present.
 * Rate limiting recommended for production.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid body" }, { status: 400 });
  }

  const { eventType, productId } = parsed.data;
  if (productId) {
    const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ ok: false, message: "Unknown product" }, { status: 400 });
    }
  }

  try {
    await insertShopAnalyticsEvent({
      eventType,
      productId: productId ?? null,
    });
  } catch (e) {
    logRouteError("POST /api/shop/analytics", e);
    return NextResponse.json({ ok: false, message: "Could not record event" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
