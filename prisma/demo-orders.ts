/**
 * Demo orders: line items reference catalog product names; unit prices = list price at time of sale.
 */
export type ProductForDemo = { id: string; name: string; basePriceCents: number };

export type DemoLineTemplate = { productName: string; quantity: number };

export type DemoOrderTemplate = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  /** days ago for preferredDate; omit = none */
  preferredDateDaysAgo?: number;
  status: string;
  notes?: string;
  channel?: string;
  orderType?: string;
  createdDaysAgo: number;
  items: DemoLineTemplate[];
};

export type MaterializedDemoOrder = Omit<
  DemoOrderTemplate,
  "items" | "createdDaysAgo" | "preferredDateDaysAgo"
> & {
  totalCents: number;
  createdAt: Date;
  updatedAt: Date;
  preferredDate?: Date;
  items: { productId: string; quantity: number; unitPriceCents: number }[];
};

function daysAgoFn(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Core scenarios + open orders */
export const DEMO_ORDER_TEMPLATES: DemoOrderTemplate[] = [
  {
    customerName: "Abena Mensah",
    customerEmail: "abena@example.com",
    customerPhone: "555-0101",
    preferredDateDaysAgo: 1,
    status: "completed",
    notes: "Birthday party platter — add extra hot sauce on the side",
    channel: "web",
    orderType: "pickup",
    createdDaysAgo: 5,
    items: [
      { productName: "Ghana Pie",    quantity: 6 },
      { productName: "Samosa",       quantity: 6 },
      { productName: "Classic Cupcake", quantity: 4 },
    ],
  },
  {
    customerName: "James Okafor",
    customerEmail: "james@example.com",
    preferredDateDaysAgo: 0,
    status: "completed",
    channel: "walk-in",
    orderType: "pickup",
    createdDaysAgo: 3,
    items: [
      { productName: "Sausage Roll",    quantity: 3 },
      { productName: "Peppery Gizzards", quantity: 1 },
    ],
  },
  {
    customerName: "Chidera Nwosu",
    customerEmail: "chidera@example.com",
    customerPhone: "555-0102",
    preferredDateDaysAgo: 2,
    status: "completed",
    notes: "Wedding cake — 3 tiers, champagne and strawberry flavors, white fondant",
    channel: "phone",
    orderType: "delivery",
    createdDaysAgo: 10,
    items: [
      { productName: "Custom Celebration Cake", quantity: 1 },
    ],
  },
  {
    customerName: "Sandra Boateng",
    customerEmail: "sandra@example.com",
    status: "confirmed",
    channel: "web",
    orderType: "pickup",
    createdDaysAgo: 1,
    items: [
      { productName: "Cupcake Box (6)", quantity: 2 },
      { productName: "Ghana Pie",       quantity: 4 },
    ],
  },
  {
    customerName: "Kofi Asante",
    customerEmail: "kofi@example.com",
    status: "pending",
    channel: "web",
    orderType: "pickup",
    createdDaysAgo: 0,
    items: [
      { productName: "Samosa",        quantity: 4 },
      { productName: "Sausage Roll",  quantity: 2 },
    ],
  },
  {
    customerName: "Pearl Events Co.",
    customerEmail: "orders@pearlevents.com",
    customerPhone: "555-0200",
    preferredDateDaysAgo: 7,
    status: "completed",
    notes: "Wholesale — weekly corporate event supply",
    channel: "wholesale",
    orderType: "delivery",
    createdDaysAgo: 14,
    items: [
      { productName: "Ghana Pie",        quantity: 12 },
      { productName: "Samosa",           quantity: 12 },
      { productName: "Sausage Roll",     quantity: 8  },
      { productName: "Peppery Gizzards", quantity: 3  },
    ],
  },
];

/** Extra completed walk-in / web orders in the last 28 days (revenue for Insights). */
export function buildExtraCompletedOrderTemplates(): DemoOrderTemplate[] {
  const names = [
    "Classic Cupcake",
    "Ghana Pie",
    "Samosa",
    "Sausage Roll",
    "Peppery Gizzards",
  ] as const;
  const out: DemoOrderTemplate[] = [];
  for (let i = 0; i < 26; i++) {
    const day = i % 28;
    const a = names[i % names.length];
    const b = names[(i + 2) % names.length];
    const c = names[(i + 4) % names.length];
    out.push({
      customerName: `Guest ${String(i + 1).padStart(2, "0")}`,
      customerEmail: `guest${i + 1}@demo.lamadrina.test`,
      status: "completed",
      channel: i % 3 === 0 ? "web" : "walk-in",
      orderType: "pickup",
      createdDaysAgo: day,
      items: [
        { productName: a, quantity: 1 + (i % 3) },
        { productName: b, quantity: 1 },
        ...(i % 4 === 0 ? [{ productName: c, quantity: 2 }] : []),
      ],
    });
  }
  return out;
}

export function materializeDemoOrders(
  products: ProductForDemo[],
  templates: DemoOrderTemplate[],
  daysAgo: (d: number) => Date = daysAgoFn
): MaterializedDemoOrder[] {
  const byName = new Map(products.map((p) => [p.name, p]));
  return templates.map((t) => {
    const items = t.items.map((line) => {
      const p = byName.get(line.productName);
      if (!p) throw new Error(`Demo order references unknown product: ${line.productName}`);
      return {
        productId: p.id,
        quantity: line.quantity,
        unitPriceCents: p.basePriceCents,
      };
    });
    const totalCents = items.reduce((s, it) => s + it.quantity * it.unitPriceCents, 0);
    const createdAt = daysAgo(t.createdDaysAgo);
    return {
      customerName: t.customerName,
      customerEmail: t.customerEmail,
      customerPhone: t.customerPhone,
      status: t.status,
      notes: t.notes,
      channel: t.channel,
      orderType: t.orderType,
      totalCents,
      createdAt,
      updatedAt: createdAt,
      preferredDate:
        t.preferredDateDaysAgo !== undefined ? daysAgo(t.preferredDateDaysAgo) : undefined,
      items,
    };
  });
}

export function allDemoOrderTemplates(): DemoOrderTemplate[] {
  return [...DEMO_ORDER_TEMPLATES, ...buildExtraCompletedOrderTemplates()];
}

/** Lighter demo expenses so Insights gross profit stays positive with seeded orders. */
export const DEMO_EXPENSES_RELATIVE_DAYS = [
  { daysAgo: 2, category: "ingredients", amountCents: 4200, description: "Flour, butter, almonds", isFixed: false },
  { daysAgo: 5, category: "labor", amountCents: 6000, description: "Weekly staff", isFixed: false },
  { daysAgo: 0, category: "rent", amountCents: 25000, description: "Monthly rent", isFixed: true },
  { daysAgo: 10, category: "utilities", amountCents: 2100, description: "Electricity, gas", isFixed: true },
  { daysAgo: 3, category: "ingredients", amountCents: 2000, description: "Dairy, eggs", isFixed: false },
  { daysAgo: 15, category: "marketing", amountCents: 2500, description: "Instagram ads", isFixed: false },
  { daysAgo: 7, category: "labor", amountCents: 4000, description: "Part-time help", isFixed: false },
  { daysAgo: 20, category: "other", amountCents: 800, description: "Supplies", isFixed: false },
];
