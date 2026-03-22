import { prisma } from "@/lib/db";
import { isPrismaReplicaSetError, createOrderWithItemsNative } from "@/lib/mongo-order-patch";
import { z } from "zod";

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
  specifications: z.string().max(4000).optional().nullable(),
  /** Per unit, pesewas. Required for quote-priced products; optional override for catalog. */
  unitPriceCents: z.number().int().min(1).optional(),
});

export const adminCreateOrderSchema = z.object({
  customerName: z.string().min(1).max(200).trim(),
  customerEmail: z.string().email().max(320),
  customerPhone: z.string().max(50).optional().nullable(),
  preferredDate: z.string().max(40).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
  internalNotes: z.string().max(8000).optional().nullable(),
  channel: z
    .enum(["web", "walk-in", "phone", "delivery-app", "wholesale"])
    .optional()
    .default("walk-in"),
  orderType: z.enum(["pickup", "delivery"]).optional().nullable(),
  status: z.enum(["pending", "confirmed"]).optional().default("pending"),
  items: z.array(lineSchema).min(1).max(80),
});

export type AdminCreateOrderInput = z.infer<typeof adminCreateOrderSchema>;

function parsePreferredDate(raw: string | null | undefined): Date | null {
  if (raw == null || raw === "") return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export type ResolvedAdminOrderLine = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  specifications: string | null;
};

/**
 * Validates products, computes line prices from current catalog (server-side).
 */
export async function resolveAdminOrderLines(
  items: AdminCreateOrderInput["items"]
): Promise<{ ok: true; lines: ResolvedAdminOrderLine[]; totalCents: number } | { ok: false; message: string }> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true, basePriceCents: true, pricingMode: true, name: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: ResolvedAdminOrderLine[] = [];
  for (const row of items) {
    const p = byId.get(row.productId);
    if (!p) {
      return { ok: false, message: `Unknown or inactive product: ${row.productId}` };
    }
    const mode = p.pricingMode ?? "catalog";
    let unitPriceCents: number;
    if (mode === "quote") {
      if (row.unitPriceCents == null) {
        return {
          ok: false,
          message: `“${p.name}” is quote-priced: enter the agreed unit price before saving the order.`,
        };
      }
      unitPriceCents = row.unitPriceCents;
    } else {
      unitPriceCents = row.unitPriceCents ?? p.basePriceCents;
    }
    if (unitPriceCents < 1) {
      return { ok: false, message: `Invalid unit price for “${p.name}”.` };
    }
    lines.push({
      productId: row.productId,
      quantity: row.quantity,
      unitPriceCents,
      specifications: row.specifications?.trim() ? row.specifications.trim() : null,
    });
  }
  const totalCents = lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0);
  if (totalCents <= 0) {
    return { ok: false, message: "Order total must be positive" };
  }
  return { ok: true, lines, totalCents };
}

export async function createAdminOrder(
  input: AdminCreateOrderInput
): Promise<{ ok: true; orderId: string } | { ok: false; message: string; code?: string }> {
  const resolved = await resolveAdminOrderLines(input.items);
  if (!resolved.ok) return resolved;

  const preferredDate = parsePreferredDate(input.preferredDate ?? null);
  const notes = input.notes?.trim() ? input.notes.trim() : null;
  const internalNotes = input.internalNotes?.trim() ? input.internalNotes.trim() : null;
  const customerPhone = input.customerPhone?.trim() ? input.customerPhone.trim() : null;

  const baseData = {
    customerName: input.customerName,
    customerEmail: input.customerEmail.trim().toLowerCase(),
    customerPhone,
    preferredDate,
    status: input.status,
    totalCents: resolved.totalCents,
    notes,
    internalNotes,
    channel: input.channel,
    orderType: input.orderType ?? null,
  };

  try {
    const order = await prisma.order.create({
      data: {
        ...baseData,
        items: {
          create: resolved.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            specifications: l.specifications,
          })),
        },
      },
      select: { id: true },
    });
    return { ok: true, orderId: order.id };
  } catch (e) {
    if (!isPrismaReplicaSetError(e)) throw e;
    const orderId = await createOrderWithItemsNative({
      ...baseData,
      items: resolved.lines,
    });
    return { ok: true, orderId };
  }
}
