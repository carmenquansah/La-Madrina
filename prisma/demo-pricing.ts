/**
 * Demo estimated costs for Insights → Pricing (manual source) and margin math.
 * Ensaimada: high cost vs price → low margin + below suggested min price.
 * Croissant: cost → ~15% margin (under 20% alert).
 */
import type { PrismaClient } from "@prisma/client";
import type { Db } from "mongodb";

export const DEMO_ESTIMATED_COST_CENTS_BY_NAME: Record<string, number> = {
  "Pan de Campo": 320,
  "Croissant": 295,
  "Tarta de Santiago": 540,
  "Ensaimada": 345,
  "Custom Cake": 1400,
};

export async function applyDemoProductCostsPrisma(prisma: PrismaClient): Promise<void> {
  for (const [name, estimatedCostCents] of Object.entries(DEMO_ESTIMATED_COST_CENTS_BY_NAME)) {
    await prisma.product.updateMany({
      where: { name },
      data: { estimatedCostCents },
    });
  }
}

/** Standalone MongoDB: set costs on Product documents by name. */
export async function applyDemoProductCostsNative(db: Db): Promise<void> {
  const now = new Date();
  const col = db.collection("Product");
  for (const [name, estimatedCostCents] of Object.entries(DEMO_ESTIMATED_COST_CENTS_BY_NAME)) {
    await col.updateMany({ name }, { $set: { estimatedCostCents, updatedAt: now } });
  }
}
