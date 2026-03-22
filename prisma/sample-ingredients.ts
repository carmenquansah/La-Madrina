/**
 * Sample bakery ingredients for admin / recipe testing (seed only).
 * purchaseQuantity is the pack size in `unit`; purchaseCostCents is the whole pack.
 */
export const SAMPLE_INGREDIENTS = [
  { name: "Bread flour", unit: "lb", purchaseQuantity: 25, purchaseCostCents: 1899 },
  { name: "European butter", unit: "lb", purchaseQuantity: 1, purchaseCostCents: 649 },
  { name: "Large eggs", unit: "each", purchaseQuantity: 12, purchaseCostCents: 449 },
  { name: "Granulated sugar", unit: "lb", purchaseQuantity: 4, purchaseCostCents: 399 },
  { name: "Blanched almonds", unit: "lb", purchaseQuantity: 1, purchaseCostCents: 999 },
  { name: "Instant yeast", unit: "oz", purchaseQuantity: 16, purchaseCostCents: 899 },
  { name: "Whole milk", unit: "gal", purchaseQuantity: 1, purchaseCostCents: 459 },
  { name: "Vanilla extract", unit: "oz", purchaseQuantity: 8, purchaseCostCents: 1299 },
] as const;
