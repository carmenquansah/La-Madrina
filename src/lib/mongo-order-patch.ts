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
export async function patchOrderNative(
  id: string,
  patch: { status?: string; channel?: string | null; orderType?: string | null }
): Promise<{ matched: boolean }> {
  const client = new MongoClient(getMongoUrl());
  await client.connect();
  try {
    const db = client.db();
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.status !== undefined) $set.status = patch.status;
    if (patch.channel !== undefined) $set.channel = patch.channel;
    if (patch.orderType !== undefined) $set.orderType = patch.orderType;

    const result = await db.collection("Order").updateOne(
      { _id: new ObjectId(id) },
      { $set }
    );
    return { matched: result.matchedCount > 0 };
  } finally {
    await client.close();
  }
}
