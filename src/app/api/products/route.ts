/**
 * GET /api/products — list active products for the shop.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logRouteError } from "@/lib/safe-server-log";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({
      ok: true,
      data: products.map((p) => {
        const mode = p.pricingMode ?? "catalog";
        const isQuote = mode === "quote";
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          /** Omitted for quote-priced items so the shop does not show a fixed list price. */
          basePriceCents: isQuote ? null : p.basePriceCents,
          category: p.category,
          pricingMode: mode,
        };
      }),
    });
  } catch (e) {
    logRouteError("GET /api/products", e);
    return NextResponse.json(
      { ok: false, message: "Failed to load products" },
      { status: 500 }
    );
  }
}
