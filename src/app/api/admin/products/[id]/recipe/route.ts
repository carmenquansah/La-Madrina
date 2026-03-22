import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";
import {
  computeRecipeBatchCostCents,
  computeUnitCostCentsFromBatch,
} from "@/lib/economics";
import type { EconomicsConfigValues } from "@/lib/economics-config";
import { economicsConfigApiPayload, loadEconomicsValues } from "@/lib/economics-config";

const putSchema = z.object({
  batchSize: z.number().int().min(1),
  laborMinutesPerBatch: z.number().min(0),
  laborRateCentsPerHour: z.number().int().min(0).nullable().optional(),
  overheadCentsPerBatch: z.number().int().min(0).nullable().optional(),
  lines: z.array(
    z.object({
      ingredientId: z.string().min(1),
      amount: z.number().positive(),
      wasteFactor: z.number().min(0).max(1).optional().default(0),
    })
  ),
});

function buildComputed(
  recipe: {
    batchSize: number;
    laborMinutesPerBatch: number;
    laborRateCentsPerHour: number | null;
    overheadCentsPerBatch: number | null;
  },
  lines: {
    amount: number;
    wasteFactor: number;
    ingredient: { purchaseCostCents: number; purchaseQuantity: number };
  }[],
  cfg: EconomicsConfigValues
) {
  const { ingredientsCents, laborCents, overheadCents, totalBatchCents } =
    computeRecipeBatchCostCents(recipe, lines, cfg);
  const unitCostCents = computeUnitCostCentsFromBatch(totalBatchCents, recipe.batchSize);
  return {
    ingredientsCents,
    laborCents,
    overheadCents,
    totalBatchCents,
    unitCostCents,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ ok: false, message: "Product not found" }, { status: 404 });
  }

  const { row: econRow, values: econValues } = await loadEconomicsValues();
  const recipe = await prisma.productRecipe.findUnique({
    where: { productId },
    include: {
      ingredients: { include: { ingredient: true } },
    },
  });

  if (!recipe) {
    return NextResponse.json({
      ok: true,
      data: {
        productId,
        recipe: null,
        economicsConfig: economicsConfigApiPayload(econRow),
        computed: null,
      },
    });
  }

  const computed = buildComputed(
    recipe,
    recipe.ingredients.map((l) => ({
      amount: l.amount,
      wasteFactor: l.wasteFactor,
      ingredient: l.ingredient,
    })),
    econValues
  );

  return NextResponse.json({
    ok: true,
    data: {
      productId,
      recipe: {
        id: recipe.id,
        batchSize: recipe.batchSize,
        laborMinutesPerBatch: recipe.laborMinutesPerBatch,
        laborRateCentsPerHour: recipe.laborRateCentsPerHour,
        overheadCentsPerBatch: recipe.overheadCentsPerBatch,
        lines: recipe.ingredients.map((l) => ({
          id: l.id,
          ingredientId: l.ingredientId,
          ingredientName: l.ingredient.name,
          ingredientUnit: l.ingredient.unit,
          amount: l.amount,
          wasteFactor: l.wasteFactor,
        })),
      },
      economicsConfig: economicsConfigApiPayload(econRow),
      computed,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ ok: false, message: "Product not found" }, { status: 404 });
  }

  const parsed = putSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid input", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { batchSize, laborMinutesPerBatch, laborRateCentsPerHour, overheadCentsPerBatch, lines } =
    parsed.data;

  const ingredientIds = [...new Set(lines.map((l) => l.ingredientId))];
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
  });
  if (ingredients.length !== ingredientIds.length) {
    return NextResponse.json(
      { ok: false, message: "One or more ingredient IDs are invalid" },
      { status: 400 }
    );
  }

  const { row: econRow, values: econValues } = await loadEconomicsValues();

  const recipe = await prisma.productRecipe.upsert({
    where: { productId },
    create: {
      productId,
      batchSize,
      laborMinutesPerBatch,
      laborRateCentsPerHour: laborRateCentsPerHour ?? null,
      overheadCentsPerBatch: overheadCentsPerBatch ?? null,
    },
    update: {
      batchSize,
      laborMinutesPerBatch,
      laborRateCentsPerHour: laborRateCentsPerHour ?? null,
      overheadCentsPerBatch: overheadCentsPerBatch ?? null,
    },
  });

  await prisma.productIngredient.deleteMany({ where: { recipeId: recipe.id } });
  if (lines.length > 0) {
    await prisma.productIngredient.createMany({
      data: lines.map((l) => ({
        recipeId: recipe.id,
        ingredientId: l.ingredientId,
        amount: l.amount,
        wasteFactor: l.wasteFactor ?? 0,
      })),
    });
  }

  const full = await prisma.productRecipe.findUnique({
    where: { id: recipe.id },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!full) {
    return NextResponse.json({ ok: false, message: "Recipe save failed" }, { status: 500 });
  }

  const computed = buildComputed(
    full,
    full.ingredients.map((l) => ({
      amount: l.amount,
      wasteFactor: l.wasteFactor,
      ingredient: l.ingredient,
    })),
    econValues
  );

  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "product.recipe.update",
    resource: "product",
    resourceId: productId,
    details: {
      batchSize,
      lineCount: lines.length,
      recipeId: full.id,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      productId,
      recipe: {
        id: full.id,
        batchSize: full.batchSize,
        laborMinutesPerBatch: full.laborMinutesPerBatch,
        laborRateCentsPerHour: full.laborRateCentsPerHour,
        overheadCentsPerBatch: full.overheadCentsPerBatch,
        lines: full.ingredients.map((l) => ({
          id: l.id,
          ingredientId: l.ingredientId,
          ingredientName: l.ingredient.name,
          ingredientUnit: l.ingredient.unit,
          amount: l.amount,
          wasteFactor: l.wasteFactor,
        })),
      },
      economicsConfig: economicsConfigApiPayload(econRow),
      computed,
    },
  });
}
