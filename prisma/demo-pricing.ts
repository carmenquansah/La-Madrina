/**
 * Demo estimated costs for Insights → Pricing (manual source) and margin math.
 * Costs are plausible estimates — update via Admin → Products once live data is available.
 */
import type { PrismaClient } from "@prisma/client";
import type { Db } from "mongodb";

export const DEMO_ESTIMATED_COST_CENTS_BY_NAME: Record<string, number> = {
  "Custom Celebration Cake": 1400,
  "Classic Cupcake":          140,
  "Cupcake Box (6)":          820,
  "Ghana Pie":                190,
  "Samosa":                   130,
  "Sausage Roll":             160,
  "Peppery Gizzards":         380,
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
