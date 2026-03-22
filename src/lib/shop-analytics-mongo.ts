/**
 * Shop funnel events — inserted via the native MongoDB driver so writes work on
 * **standalone** MongoDB (no replica set). Prisma's `create()` uses transactions
 * internally, which require a replica set (see prisma docs / MongoDB limitation).
 */
import { MongoClient, ObjectId } from "mongodb";

const globalForMongo = globalThis as unknown as {
  shopAnalyticsMongoClient: Promise<MongoClient> | undefined;
};

function getMongoClient(): Promise<MongoClient> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForMongo.shopAnalyticsMongoClient) {
    globalForMongo.shopAnalyticsMongoClient = new MongoClient(url).connect();
  }
  return globalForMongo.shopAnalyticsMongoClient;
}

/** Collection name matches Prisma model `ShopAnalyticsEvent` (default mapping). */
const COLLECTION = "ShopAnalyticsEvent";

export async function insertShopAnalyticsEvent(input: {
  eventType: string;
  productId: string | null;
}): Promise<void> {
  const client = await getMongoClient();
  const db = client.db();
  await db.collection(COLLECTION).insertOne({
    _id: new ObjectId(),
    eventType: input.eventType,
    productId: input.productId ? new ObjectId(input.productId) : null,
    createdAt: new Date(),
  });
}
