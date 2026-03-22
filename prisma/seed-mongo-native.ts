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
          name: "Pan de Campo",
          description: "Rustic country loaf",
          imageUrl:
            "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 650,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Pan de Campo"],
          category: "bread",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Croissant",
          description: "Buttery classic",
          imageUrl:
            "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 350,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Croissant"],
          category: "pastries",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Tarta de Santiago",
          description: "Almond cake",
          imageUrl:
            "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 1200,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Tarta de Santiago"],
          category: "cakes",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Ensaimada",
          description: "Mallorcan pastry",
          imageUrl:
            "https://images.unsplash.com/photo-1612203985729-70726954388c?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 400,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Ensaimada"],
          category: "pastries",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          name: "Custom Cake",
          description: "Custom order — specify in notes",
          imageUrl:
            "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80&auto=format&fit=crop",
          basePriceCents: 2500,
          estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Custom Cake"],
          category: "custom",
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

  const required = ["Pan de Campo", "Croissant", "Tarta de Santiago", "Ensaimada", "Custom Cake"];
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
