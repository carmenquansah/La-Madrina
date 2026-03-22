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
            name: "Pan de Campo",
            description: "Rustic country loaf",
            imageUrl:
              "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 650,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Pan de Campo"],
            category: "bread",
          },
          {
            name: "Croissant",
            description: "Buttery classic",
            imageUrl:
              "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 350,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Croissant"],
            category: "pastries",
          },
          {
            name: "Tarta de Santiago",
            description: "Almond cake",
            imageUrl:
              "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 1200,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Tarta de Santiago"],
            category: "cakes",
          },
          {
            name: "Ensaimada",
            description: "Mallorcan pastry",
            imageUrl:
              "https://images.unsplash.com/photo-1612203985729-70726954388c?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 400,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Ensaimada"],
            category: "pastries",
          },
          {
            name: "Custom Cake",
            description: "Custom order — specify in notes",
            imageUrl:
              "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80&auto=format&fit=crop",
            basePriceCents: 2500,
            estimatedCostCents: DEMO_ESTIMATED_COST_CENTS_BY_NAME["Custom Cake"],
            category: "custom",
            pricingMode: "quote",
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
