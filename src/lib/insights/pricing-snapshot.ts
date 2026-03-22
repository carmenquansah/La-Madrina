import { prisma } from "@/lib/db";
import { computeRecipeUnitCostCents } from "@/lib/economics";
import { loadEconomicsValues } from "@/lib/economics-config";
import { formatGhs } from "@/lib/format-money";
import { currentPeriodRange } from "@/lib/business-calendar";

export const TARGET_MARGIN_PCT = 30;
export const LOW_MARGIN_ALERT_PCT = 20;

export type PricingSnapshotRow = {
  productId: string;
  name: string;
  category: string;
  basePriceCents: number;
  estimatedCostCents: number | null;
  effectiveCostCents: number | null;
  costSource: "recipe" | "manual" | "none";
  marginCents: number;
  marginPct: number;
  unitsSold: number;
  revenueCents: number;
  demandTier: "high" | "medium" | "low" | "none";
  suggestedMinPriceCents: number | null;
  targetMarginPct: number;
  suggestedMinPriceNote: string;
  priceAlert: string | null;
};

export type PricingSnapshotData = {
  periodDays: number;
  targetMarginPct: number;
  lowMarginAlertPct: number;
  pricing: PricingSnapshotRow[];
};

export async function loadPricingSnapshotData(daysInput: number): Promise<PricingSnapshotData> {
  const days = Math.min(365, Math.max(1, daysInput || 30));
  const { since, untilExclusive } = currentPeriodRange(days);

  const [products, { values: economicsValues }] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        basePriceCents: true,
        estimatedCostCents: true,
        category: true,
        recipe: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    }),
    loadEconomicsValues(),
  ]);

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

  const quantities = Object.values(unitsSold).filter((q) => q > 0);
  const sortedQty = [...quantities].sort((a, b) => a - b);
  const p33 = sortedQty[Math.floor(sortedQty.length * 0.33)] ?? 0;
  const p66 = sortedQty[Math.floor(sortedQty.length * 0.66)] ?? 0;

  function demandTier(q: number): "high" | "medium" | "low" | "none" {
    if (q === 0) return "none";
    if (sortedQty.length === 0) return "low";
    if (q >= p66) return "high";
    if (q >= p33) return "medium";
    return "low";
  }

  const pricing: PricingSnapshotRow[] = products.map((p) => {
    const recipe = p.recipe;
    const unitFromRecipe =
      recipe != null
        ? computeRecipeUnitCostCents(
            recipe,
            recipe.ingredients.map((line) => ({
              amount: line.amount,
              wasteFactor: line.wasteFactor,
              ingredient: line.ingredient,
            })),
            economicsValues
          )
        : null;

    const costSource: "recipe" | "manual" | "none" =
      recipe != null ? "recipe" : p.estimatedCostCents != null ? "manual" : "none";
    const cost = unitFromRecipe ?? p.estimatedCostCents ?? 0;
    const effectiveCostCents = unitFromRecipe ?? p.estimatedCostCents;

    const marginCents = p.basePriceCents - cost;
    const marginPct = p.basePriceCents > 0 ? Math.round((marginCents / p.basePriceCents) * 100) : 0;
    const units = unitsSold[p.id] ?? 0;
    const revenueCents = revenueByProduct[p.id] ?? 0;

    const suggestedMinPriceCents =
      cost > 0 ? Math.ceil((cost * 100) / (100 - TARGET_MARGIN_PCT)) : null;
    const suggestedMinPriceNote =
      cost > 0
        ? `At least ${formatGhs(suggestedMinPriceCents!)} for ${TARGET_MARGIN_PCT}% margin`
        : recipe == null
          ? "Add a recipe or set est. cost to see suggested price"
          : "Recipe has zero computed cost — check batch size and lines";

    const belowSuggested =
      suggestedMinPriceCents != null && p.basePriceCents < suggestedMinPriceCents;
    const lowMargin = cost > 0 && marginPct < LOW_MARGIN_ALERT_PCT;
    const priceAlert = belowSuggested || lowMargin ? (belowSuggested ? "below_suggested" : "low_margin") : null;

    return {
      productId: p.id,
      name: p.name,
      category: p.category,
      basePriceCents: p.basePriceCents,
      estimatedCostCents: p.estimatedCostCents,
      effectiveCostCents,
      costSource,
      marginCents,
      marginPct,
      unitsSold: units,
      revenueCents,
      demandTier: demandTier(units),
      suggestedMinPriceCents,
      targetMarginPct: TARGET_MARGIN_PCT,
      suggestedMinPriceNote,
      priceAlert,
    };
  });

  return {
    periodDays: days,
    targetMarginPct: TARGET_MARGIN_PCT,
    lowMarginAlertPct: LOW_MARGIN_ALERT_PCT,
    pricing,
  };
}
