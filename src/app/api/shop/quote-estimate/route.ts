import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getQuotePricingSuggestion } from "@/lib/quote-pricing";
import { getClientIp } from "@/lib/login-rate-limit";
import { checkShopQuoteRateLimit } from "@/lib/shop-quote-rate-limit";
import { logRouteError } from "@/lib/safe-server-log";

const bodySchema = z.object({
  productId: z.string().min(1),
  /** Customer description of what they want — required so estimates happen after intent is captured */
  description: z.string().min(12, "Please describe what you’d like (at least a few words)."),
});

/**
 * Public: suggested price band for quote-priced products after the customer describes their order.
 * Does not use free-text for costing (cost still comes from recipe / estimated cost in admin).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkShopQuoteRateLimit(ip);
  if (!limit.ok) {
    const res = NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a moment." },
      { status: 429 }
    );
    res.headers.set("Retry-After", String(limit.retryAfterSec));
    return res;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.description?.[0] ?? "Invalid request";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }

  const { productId, description } = parsed.data;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, active: true, pricingMode: true, name: true },
    });
    if (!product || !product.active) {
      return NextResponse.json({ ok: false, message: "Product not available" }, { status: 404 });
    }
    if ((product.pricingMode ?? "catalog") !== "quote") {
      return NextResponse.json(
        { ok: false, message: "This product uses a fixed menu price — no quote estimate here." },
        { status: 400 }
      );
    }

    const result = await getQuotePricingSuggestion(productId);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message, code: result.code },
        { status: result.code === "NOT_FOUND" ? 404 : 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        productId: result.productId,
        productName: result.productName,
        descriptionPreview: description.slice(0, 120),
        unitCostCents: result.unitCostCents,
        suggestedUnitCents: result.suggestedUnitCents,
        minUnitCents: result.minUnitCents,
        maxUnitCents: result.maxUnitCents,
        targetMarginPct: result.targetMarginPct,
        basisNote: result.basisNote,
      },
    });
  } catch (e) {
    logRouteError("POST /api/shop/quote-estimate", e);
    return NextResponse.json({ ok: false, message: "Could not compute estimate" }, { status: 500 });
  }
}
