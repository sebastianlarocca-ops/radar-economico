import { MongoClient, Db, Collection } from "mongodb";
import type { IndicatorValue } from "./types";

// Singleton client — Next.js can hot-reload modules in dev, so we pin to globalThis.
// In production, this still resolves to one client per Lambda/edge instance.

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "radar";

if (!uri) {
  // Don't throw at import — that breaks `next build`. Throw lazily on first use.
  console.warn("[mongodb] MONGODB_URI is not set. DB calls will fail until it is.");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI not configured");
  if (process.env.NODE_ENV === "development") {
    if (!globalThis._mongoClientPromise) {
      globalThis._mongoClient = new MongoClient(uri);
      globalThis._mongoClientPromise = globalThis._mongoClient.connect();
    }
    return globalThis._mongoClientPromise;
  }
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClient = new MongoClient(uri);
    globalThis._mongoClientPromise = globalThis._mongoClient.connect();
  }
  return globalThis._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

export async function getIndicatorValuesCollection(): Promise<Collection<IndicatorValue>> {
  const db = await getDb();
  const col = db.collection<IndicatorValue>("indicator_values");
  // Idempotent index creation. Mongo no-ops if it already exists.
  await col.createIndex({ indicator: 1, timestamp: -1 });
  return col;
}
