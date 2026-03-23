/**
 * Seed: one admin user + sample products.
 * Run after migrate: npx prisma db seed
 *
 * If MongoDB is not a replica set, Prisma writes fail (P2031); we fall back to
 * the native mongodb driver (see seed-mongo-native.ts).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { DEMO_ESTIMATED_COST_CENTS_BY_NAME } from "./demo-pricing";
import { SAMPLE_INGREDIENTS } from "./sample-ingredients";
import { isReplicaSetError, seedBaseNative } from "./seed-mongo-native";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  try {
    const existing = await prisma.adminUser.findUnique({
      where: { email: "admin@lamadrina.local" },
    });
    if (!existing) {
      await prisma.adminUser.create({
        data: {
          email: "admin@lamadrina.local",
          passwordHash: hash,
          active: true,
        },
      });
    }

    const count = await prisma.product.count();
    if (count === 0) {
      await prisma.product.createMany({
        data: [
          {
            name: "Custom Celebration Cake",
            description: "Tell us your vision — size, flavor, finish, and occasion. We'll send you a price range, then the owner confirms the final quote before accepting.",
            imageUrl:
              "https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 0,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Custom Celebration Cake"],
            category: "custom",
            pricingMode: "quote",
          },
          {
            name: "Classic Cupcake",
            description: "Light vanilla sponge topped with buttercream frosting. Available in a variety of colors and flavors.",
            imageUrl:
              "https://images.unsplash.com/photo-1563729784474-d77dbb933176?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 350,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Classic Cupcake"],
            category: "cupcakes",
          },
          {
            name: "Cupcake Box (6)",
            description: "A half-dozen cupcakes, assorted or matching — perfect for gifts, events, and celebrations.",
            imageUrl:
              "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 1800,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Cupcake Box (6)"],
            category: "cupcakes",
          },
          {
            name: "Ghana Pie",
            description: "Flaky shortcrust pastry filled with seasoned beef mince, onions, and scotch bonnet — a La Madrina staple.",
            imageUrl:
              "https://images.unsplash.com/photo-1604467852206-d9f7e2daf23e?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 450,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Ghana Pie"],
            category: "finger-foods",
          },
          {
            name: "Samosa",
            description: "Crispy pastry parcels packed with spiced beef and vegetables. Served fresh.",
            imageUrl:
              "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 350,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Samosa"],
            category: "finger-foods",
          },
          {
            name: "Sausage Roll",
            description: "Buttery puff pastry rolled around seasoned pork sausage. Golden-baked to order.",
            imageUrl:
              "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 400,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Sausage Roll"],
            category: "finger-foods",
          },
          {
            name: "Peppery Gizzards",
            description: "Tender chicken gizzards slow-cooked in a rich peppered sauce. A crowd-favourite at every gathering.",
            imageUrl:
              "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 850,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Peppery Gizzards"],
            category: "finger-foods",
          },
        ],
      });
    }

    const ingCount = await prisma.ingredient.count();
    if (ingCount === 0) {
      await prisma.ingredient.createMany({
        data: SAMPLE_INGREDIENTS.map((row) => ({
          name: row.name,
          unit: row.unit,
          purchaseQuantity: row.purchaseQuantity,
          purchaseCostCents: row.purchaseCostCents,
        })),
      });
      console.log(`Created ${SAMPLE_INGREDIENTS.length} sample ingredients.`);
    }
  } catch (e) {
    if (isReplicaSetError(e)) {
      console.warn(
        "Prisma cannot write to standalone MongoDB (replica set required). Using native mongodb driver for seed…"
      );
      await seedBaseNative(hash);
      return;
    }
    throw e;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
