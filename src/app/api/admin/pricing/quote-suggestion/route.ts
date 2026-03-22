import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { getQuotePricingSuggestion } from "@/lib/quote-pricing";

/**
 * GET ?productId= — suggested unit price + range from cost data (recipe / estimated cost).
 * Optional ?quantity= for line subtotal preview (defaults to 1).
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim() ?? "";
  const qtyRaw = searchParams.get("quantity");
  const quantity = Math.min(999, Math.max(1, parseInt(qtyRaw ?? "1", 10) || 1));

  if (!productId) {
    return NextResponse.json({ ok: false, message: "Missing productId" }, { status: 400 });
  }

  const result = await getQuotePricingSuggestion(productId);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return NextResponse.json({ ok: false, message: result.message }, { status: 404 });
    }
    return NextResponse.json({ ok: false, message: result.message, code: result.code }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      productId: result.productId,
      productName: result.productName,
      quantity,
      unitCostCents: result.unitCostCents,
      costSource: result.costSource,
      suggestedUnitCents: result.suggestedUnitCents,
      minUnitCents: result.minUnitCents,
      maxUnitCents: result.maxUnitCents,
      targetMarginPct: result.targetMarginPct,
      basisNote: result.basisNote,
      lineSubtotalSuggestedCents: result.suggestedUnitCents * quantity,
      lineSubtotalMinCents: result.minUnitCents * quantity,
      lineSubtotalMaxCents: result.maxUnitCents * quantity,
    },
  });
}
