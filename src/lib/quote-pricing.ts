import { prisma } from "@/lib/db";
import { computeRecipeUnitCostCents } from "@/lib/economics";
import { loadEconomicsValues } from "@/lib/economics-config";
import { TARGET_MARGIN_PCT } from "@/lib/insights/pricing-snapshot";

/** Lower bound of the suggested price band (moderate margin). */
export const QUOTE_RANGE_MARGIN_LOW_PCT = 12;
/** Upper bound of the suggested price band (premium margin). */
export const QUOTE_RANGE_MARGIN_HIGH_PCT = 48;

/**
 * Selling price (cents) that achieves a given margin % on revenue: margin = (price - cost) / price.
 */
export function priceForMarginOnRevenue(costCents: number, marginPct: number): number {
  if (costCents <= 0) return 0;
  const m = Math.min(95, Math.max(1, marginPct));
  return Math.ceil(costCents / (1 - m / 100));
}

export type QuotePricingSuggestion = {
  ok: true;
  productId: string;
  productName: string;
  /** Best-effort unit cost from recipe or manual estimate */
  unitCostCents: number;
  costSource: "recipe" | "manual" | "none";
  /** Recommended list / quote price */
  suggestedUnitCents: number;
  minUnitCents: number;
  maxUnitCents: number;
  targetMarginPct: number;
  /** Plain-language hint for the owner */
  basisNote: string;
};

export type QuotePricingError = { ok: false; message: string; code: "NO_COST" | "NOT_FOUND" };

/**
 * Suggested unit price and range from recorded costs (recipe + economics).
 * Owner may charge a different unit price when creating the order.
 */
export async function getQuotePricingSuggestion(
  productId: string
): Promise<QuotePricingSuggestion | QuotePricingError> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      estimatedCostCents: true,
      recipe: {
        include: {
          ingredients: { include: { ingredient: true } },
        },
      },
    },
  });

  if (!product) {
    return { ok: false, message: "Product not found", code: "NOT_FOUND" };
  }

  const { values: economicsValues } = await loadEconomicsValues();

  const recipe = product.recipe;
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
    recipe != null ? "recipe" : product.estimatedCostCents != null ? "manual" : "none";
  const unitCostCents = unitFromRecipe ?? product.estimatedCostCents ?? 0;

  if (unitCostCents <= 0) {
    return {
      ok: false,
      message:
        "No unit cost for this product. Add a recipe (or set estimated cost on the product) to generate a price range.",
      code: "NO_COST",
    };
  }

  const suggestedUnitCents = priceForMarginOnRevenue(unitCostCents, TARGET_MARGIN_PCT);
  const minUnitCents = priceForMarginOnRevenue(unitCostCents, QUOTE_RANGE_MARGIN_LOW_PCT);
  const maxUnitCents = priceForMarginOnRevenue(unitCostCents, QUOTE_RANGE_MARGIN_HIGH_PCT);

  const low = Math.min(minUnitCents, maxUnitCents);
  const high = Math.max(minUnitCents, maxUnitCents);

  const basisNote =
    costSource === "recipe"
      ? `Based on recipe + labor + overhead (${TARGET_MARGIN_PCT}% target margin). Range ≈ ${QUOTE_RANGE_MARGIN_LOW_PCT}%–${QUOTE_RANGE_MARGIN_HIGH_PCT}% margin band.`
      : costSource === "manual"
        ? `Based on estimated unit cost (${TARGET_MARGIN_PCT}% target margin). Consider adding a recipe for finer costing.`
        : "Based on recorded costs.";

  return {
    ok: true,
    productId: product.id,
    productName: product.name,
    unitCostCents,
    costSource,
    suggestedUnitCents,
    minUnitCents: low,
    maxUnitCents: high,
    targetMarginPct: TARGET_MARGIN_PCT,
    basisNote,
  };
}
