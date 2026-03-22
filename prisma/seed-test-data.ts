/**
 * Inject test data for admin: sample orders (various statuses) and expenses.
 * Run: npm run db:seed-test
 * Requires: products and admin already seeded (npm run db:seed).
 *
 * Also applies demo estimated costs so Insights → Pricing shows unit cost, margins, and sources.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { applyDemoProductCostsPrisma } from "./demo-pricing";
import { allDemoOrderTemplates, DEMO_EXPENSES_RELATIVE_DAYS, materializeDemoOrders } from "./demo-orders";
import { isReplicaSetError, seedTestDataNative } from "./seed-mongo-native";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  let products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, basePriceCents: true },
  });
  if (products.length === 0) {
    console.log("No products found. Run npm run db:seed first.");
    return;
  }

  try {
    await applyDemoProductCostsPrisma(prisma);
    console.log("Applied demo estimated costs to products (Prisma).");
  } catch (e) {
    if (!isReplicaSetError(e)) throw e;
    console.warn("Skipping Prisma product cost updates (standalone MongoDB). Native path will set costs.");
  }

  products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, basePriceCents: true },
  });

  const ordersData = materializeDemoOrders(products, allDemoOrderTemplates(), daysAgo);

  try {
    for (const o of ordersData) {
      const { items, ...orderData } = o;
      await prisma.order.create({
        data: {
          ...orderData,
          preferredDate: orderData.preferredDate ?? undefined,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
            })),
          },
        },
      });
    }
    console.log(`Created ${ordersData.length} orders.`);

    await prisma.expense.createMany({
      data: DEMO_EXPENSES_RELATIVE_DAYS.map((e) => ({
        date: daysAgo(e.daysAgo),
        category: e.category,
        amountCents: e.amountCents,
        description: e.description,
        isFixed: e.isFixed,
      })),
    });
    console.log(`Created ${DEMO_EXPENSES_RELATIVE_DAYS.length} expenses.`);
  } catch (e) {
    if (isReplicaSetError(e)) {
      console.warn(
        "Prisma cannot write orders/expenses on standalone MongoDB. Using native mongodb driver…"
      );
      await seedTestDataNative(products);
      return;
    }
    throw e;
  }

  console.log("Test data injected. Open /admin and /admin/insights to view.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
