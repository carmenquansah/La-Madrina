/**
 * Sample ingredients for La Madrina Bakery — covers cakes, cupcakes, and finger foods.
 * purchaseQuantity is the pack/unit size in `unit`; purchaseCostCents is the whole pack price.
 * Update real costs via Admin → Ingredients once live purchasing data is available.
 */
export const SAMPLE_INGREDIENTS = [
  // Baking staples
  { name: "All-purpose flour",   unit: "lb",   purchaseQuantity: 25,  purchaseCostCents: 1799 },
  { name: "Unsalted butter",     unit: "lb",   purchaseQuantity: 1,   purchaseCostCents: 649  },
  { name: "Large eggs",          unit: "each", purchaseQuantity: 12,  purchaseCostCents: 449  },
  { name: "Granulated sugar",    unit: "lb",   purchaseQuantity: 4,   purchaseCostCents: 399  },
  { name: "Baking powder",       unit: "oz",   purchaseQuantity: 8,   purchaseCostCents: 349  },
  { name: "Vanilla extract",     unit: "oz",   purchaseQuantity: 8,   purchaseCostCents: 1299 },
  { name: "Whole milk",          unit: "gal",  purchaseQuantity: 1,   purchaseCostCents: 459  },
  // Cupcake / cake frosting
  { name: "Icing sugar",         unit: "lb",   purchaseQuantity: 2,   purchaseCostCents: 299  },
  { name: "Food coloring (set)", unit: "set",  purchaseQuantity: 1,   purchaseCostCents: 899  },
  { name: "Heavy cream",         unit: "pt",   purchaseQuantity: 1,   purchaseCostCents: 399  },
  // Finger food fillings — Ghana pies & samosas
  { name: "Beef mince",          unit: "lb",   purchaseQuantity: 1,   purchaseCostCents: 699  },
  { name: "Onions",              unit: "lb",   purchaseQuantity: 3,   purchaseCostCents: 249  },
  { name: "Mixed spices",        unit: "oz",   purchaseQuantity: 4,   purchaseCostCents: 499  },
  { name: "Scotch bonnet pepper",unit: "each", purchaseQuantity: 10,  purchaseCostCents: 199  },
  // Finger food — sausage rolls & gizzards
  { name: "Puff pastry sheets",  unit: "sheet",purchaseQuantity: 6,   purchaseCostCents: 549  },
  { name: "Pork sausages",       unit: "lb",   purchaseQuantity: 1,   purchaseCostCents: 599  },
  { name: "Chicken gizzards",    unit: "lb",   purchaseQuantity: 1,   purchaseCostCents: 499  },
  { name: "Vegetable oil",       unit: "L",    purchaseQuantity: 2,   purchaseCostCents: 699  },
] as const;
