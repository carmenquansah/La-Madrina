/**
 * Fallback seed using the official MongoDB driver (insertOne / insertMany).
 * Use when Prisma returns P2031 (standalone MongoDB without replica set).
 */
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import {
  applyDemoProductCostsNative,
  DEMO_ESTIMATED_COST_CENTS_BY_NAME,
} from "./demo-pricing";
import {
  allDemoOrderTemplates,
  DEMO_EXPENSES_RELATIVE_DAYS,
  materializeDemoOrders,
  type ProductForDemo,
} from "./demo-orders";
import { SAMPLE_INGREDIENTS } from "./sample-ingredients";

function getDatabaseUrl(): string {
  const u = process.env.DATABASE_URL;
  if (!u) throw new Error("DATABASE_URL is not set");
  return u;
}

export function isReplicaSetError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2031"
  );
}

export async function seedBaseNative(passwordHash: string): Promise<void> {
  const client = new MongoClient(getDatabaseUrl());
  await client.connect();
  try {
    const db = client.db();
    const adminCol = db.collection("AdminUser");
    const existing = await adminCol.findOne({ email: "admin@lamadrina.local" });
    if (!existing) {
      await adminCol.insertOne({
        email: "admin@lamadrina.local",
        passwordHash,
        active: true,
        createdAt: new Date(),
      });
      console.log("Created admin user (native MongoDB driver).");
    } else {
      console.log("Admin user already exists.");
    }

    const productCol = db.collection("Product");
    const count = await productCol.countDocuments();
    if (count === 0) {
      const now = new Date();
      await productCol.insertMany([
        {
          name: "Custom Celebration Cake",
          description: "Tell us your vision — size, flavor, finish, and occasion. We'll send you a price range, then the owner confirms the final quote before accepting.",
          imageUrl:
            "https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 0,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Custom Celebration Cake"],
          category: "custom",
          pricingMode: "quote",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Classic Cupcake",
          description: "Light vanilla sponge topped with buttercream frosting. Available in a variety of colors and flavors.",
          imageUrl:
            "https://images.unsplash.com/photo-1563729784474-d77dbb933176?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 350,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Classic Cupcake"],
          category: "cupcakes",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Cupcake Box (6)",
          description: "A half-dozen cupcakes, assorted or matching — perfect for gifts, events, and celebrations.",
          imageUrl:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 1800,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Cupcake Box (6)"],
          category: "cupcakes",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Ghana Pie",
          description: "Flaky shortcrust pastry filled with seasoned beef mince, onions, and scotch bonnet — a La Madrina staple.",
          imageUrl:
            "https://images.unsplash.com/photo-1604467852206-d9f7e2daf23e?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 450,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Ghana Pie"],
          category: "finger-foods",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Samosa",
          description: "Crispy pastry parcels packed with spiced beef and vegetables. Served fresh.",
          imageUrl:
            "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 350,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Samosa"],
          category: "finger-foods",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Sausage Roll",
          description: "Buttery puff pastry rolled around seasoned pork sausage. Golden-baked to order.",
          imageUrl:
            "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 400,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Sausage Roll"],
          category: "finger-foods",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Peppery Gizzards",
          description: "Tender chicken gizzards slow-cooked in a rich peppered sauce. A crowd-favourite at every gathering.",
          imageUrl:
            "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 850,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Peppery Gizzards"],
          category: "finger-foods",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      console.log("Created sample products (native MongoDB driver).");
    } else {
      console.log("Products already exist; skipping product seed.");
    }

    const ingredientCol = db.collection("Ingredient");
    const ingCount = await ingredientCol.countDocuments();
    if (ingCount === 0) {
      const nowIng = new Date();
      await ingredientCol.insertMany(
        SAMPLE_INGREDIENTS.map((row) => ({
          name: row.name,
          unit: row.unit,
          purchaseQuantity: row.purchaseQuantity,
          purchaseCostCents: row.purchaseCostCents,
          createdAt: nowIng,
          updatedAt: nowIng,
        }))
      );
      console.log(`Created ${SAMPLE_INGREDIENTS.length} sample ingredients (native MongoDB driver).`);
    } else {
      console.log("Ingredients already exist; skipping ingredient seed.");
    }
  } finally {
    await client.close();
  }
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Same sample orders/expenses as seed-test-data.ts, via native writes. */
export async function seedTestDataNative(products: ProductForDemo[]): Promise<void> {
  if (products.length === 0) {
    console.log("No products found. Run npm run db:seed first.");
    return;
  }

  const required = ["Custom Celebration Cake", "Classic Cupcake", "Cupcake Box (6)", "Ghana Pie", "Samosa", "Sausage Roll", "Peppery Gizzards"];
  const nameSet = new Set(products.map((p) => p.name));
  for (const n of required) {
    if (!nameSet.has(n)) {
      console.log(`Missing product "${n}". Run npm run db:seed first.`);
      return;
    }
  }

  const oid = (hex: string) => new ObjectId(hex);

  const client = new MongoClient(getDatabaseUrl());
  await client.connect();
  try {
    const db = client.db();
    await applyDemoProductCostsNative(db);

    const orderCol = db.collection("Order");
    const itemCol = db.collection("OrderItem");

    const ordersToCreate = materializeDemoOrders(products, allDemoOrderTemplates(), daysAgo);

    let orderCount = 0;
    for (const o of ordersToCreate) {
      const { items, ...orderFields } = o;
      const orderResult = await orderCol.insertOne({
        ...orderFields,
        preferredDate: orderFields.preferredDate ?? null,
      });
      const orderId = orderResult.insertedId;
      const now = new Date();
      for (const line of items) {
        await itemCol.insertOne({
          orderId,
          productId: oid(line.productId),
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          createdAt: now,
        });
      }
      orderCount++;
    }
    console.log(`Created ${orderCount} orders (native MongoDB driver).`);

    const expenseCol = db.collection("Expense");
    const expNow = new Date();
    for (const e of DEMO_EXPENSES_RELATIVE_DAYS) {
      await expenseCol.insertOne({
        date: daysAgo(e.daysAgo),
        category: e.category,
        amountCents: e.amountCents,
        description: e.description,
        isFixed: e.isFixed,
        createdAt: expNow,
        updatedAt: expNow,
      });
    }
    console.log(`Created ${DEMO_EXPENSES_RELATIVE_DAYS.length} expenses (native MongoDB driver).`);
    console.log("Test data injected. Open /admin and /admin/insights to view.");
  } finally {
    await client.close();
  }
}
