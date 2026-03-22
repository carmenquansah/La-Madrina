import type { Ingredient, ProductRecipe } from "@prisma/client";
import type { EconomicsConfigValues } from "@/lib/economics-config";

export type IngredientCostFields = Pick<
  Ingredient,
  "purchaseCostCents" | "purchaseQuantity"
>;

export function ingredientCostPerUnitCents(ing: IngredientCostFields): number {
  if (ing.purchaseQuantity <= 0) return 0;
  return ing.purchaseCostCents / ing.purchaseQuantity;
}

/**
 * Fixed overhead allocated per batch when recipe has no override.
 */
export function defaultOverheadCentsPerBatch(cfg: EconomicsConfigValues): number {
  if (cfg.estimatedBatchesPerMonth <= 0) return 0;
  return Math.round(cfg.monthlyFixedCostsCents / cfg.estimatedBatchesPerMonth);
}

export function computeRecipeBatchCostCents(
  recipe: Pick<ProductRecipe, "laborMinutesPerBatch" | "laborRateCentsPerHour" | "overheadCentsPerBatch">,
  lines: { amount: number; wasteFactor: number; ingredient: IngredientCostFields }[],
  cfg: EconomicsConfigValues
): {
  ingredientsCents: number;
  laborCents: number;
  overheadCents: number;
  totalBatchCents: number;
} {
  const laborRate =
    recipe.laborRateCentsPerHour ?? cfg.defaultLaborRateCentsPerHour;
  const laborCents = Math.round((recipe.laborMinutesPerBatch / 60) * laborRate);

  const overheadCents =
    recipe.overheadCentsPerBatch ?? defaultOverheadCentsPerBatch(cfg);

  let ingredientsCents = 0;
  for (const line of lines) {
    const cpu = ingredientCostPerUnitCents(line.ingredient);
    const effective = line.amount * (1 + Math.max(0, line.wasteFactor));
    ingredientsCents += Math.round(effective * cpu);
  }

  const totalBatchCents = ingredientsCents + laborCents + overheadCents;
  return { ingredientsCents, laborCents, overheadCents, totalBatchCents };
}

export function computeUnitCostCentsFromBatch(
  totalBatchCents: number,
  batchSize: number
): number {
  if (batchSize <= 0) return 0;
  return Math.round(totalBatchCents / batchSize);
}

/** Unit cost for one sale item from recipe + global economics (when recipe exists). */
export function computeRecipeUnitCostCents(
  recipe: Pick<
    ProductRecipe,
    | "batchSize"
    | "laborMinutesPerBatch"
    | "laborRateCentsPerHour"
    | "overheadCentsPerBatch"
  >,
  lines: { amount: number; wasteFactor: number; ingredient: IngredientCostFields }[],
  cfg: EconomicsConfigValues
): number {
  const { totalBatchCents } = computeRecipeBatchCostCents(recipe, lines, cfg);
  return computeUnitCostCentsFromBatch(totalBatchCents, recipe.batchSize);
}
