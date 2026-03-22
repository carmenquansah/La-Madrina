import { MongoClient, ObjectId } from "mongodb";

function getMongoUrl(): string {
  const u = process.env.DATABASE_URL;
  if (!u) throw new Error("DATABASE_URL is not set");
  return u;
}

export function isPrismaReplicaSetError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2031"
  );
}

/**
 * Update order fields without Prisma transactions (standalone MongoDB).
 * Prisma `update()` can throw P2031 when the server is not a replica set.
 */
export type OrderPatchFields = {
  status?: string;
  channel?: string | null;
  orderType?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
};

export async function patchOrderNative(
  id: string,
  patch: OrderPatchFields
): Promise<{ matched: boolean }> {
  const client = new MongoClient(getMongoUrl());
  await client.connect();
  try {
    const db = client.db();
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.status !== undefined) $set.status = patch.status;
    if (patch.channel !== undefined) $set.channel = patch.channel;
    if (patch.orderType !== undefined) $set.orderType = patch.orderType;
    if (patch.notes !== undefined) $set.notes = patch.notes;
    if (patch.internalNotes !== undefined) $set.internalNotes = patch.internalNotes;

    const result = await db.collection("Order").updateOne(
      { _id: new ObjectId(id) },
      { $set }
    );
    return { matched: result.matchedCount > 0 };
  } finally {
    await client.close();
  }
}

export type NativeOrderInsert = {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  preferredDate: Date | null;
  status: string;
  totalCents: number;
  notes: string | null;
  internalNotes: string | null;
  channel: string | null;
  orderType: string | null;
  items: {
    productId: string;
    quantity: number;
    unitPriceCents: number;
    specifications: string | null;
  }[];
};

/** Insert order + line items (standalone MongoDB). Returns new order id as hex string. */
export async function createOrderWithItemsNative(data: NativeOrderInsert): Promise<string> {
  const client = new MongoClient(getMongoUrl());
  await client.connect();
  try {
    const db = client.db();
    const orderId = new ObjectId();
    const now = new Date();
    await db.collection("Order").insertOne({
      _id: orderId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      preferredDate: data.preferredDate,
      status: data.status,
      totalCents: data.totalCents,
      notes: data.notes,
      internalNotes: data.internalNotes,
      channel: data.channel,
      orderType: data.orderType,
      createdAt: now,
      updatedAt: now,
    });
    const itemCol = db.collection("OrderItem");
    for (const line of data.items) {
      await itemCol.insertOne({
        orderId,
        productId: new ObjectId(line.productId),
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        specifications: line.specifications,
        createdAt: now,
      });
    }
    return orderId.toHexString();
  } finally {
    await client.close();
  }
}
