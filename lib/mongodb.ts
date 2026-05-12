import { MongoClient, Db, Collection } from "mongodb";
import type { IndicatorValue } from "./types";

// Singleton client. In dev, Next.js hot-reloads modules — we pin to globalThis to avoid
// leaking connection pools. In prod, one client per Lambda instance.

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "radar";

if (!uri) {
  console.warn("[mongodb] MONGODB_URI is not set. DB calls will fail until it is.");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _radarIndexesEnsured: boolean | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI not configured");
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
  if (!globalThis._radarIndexesEnsured) {
    // Unique compound index — backfills and daily cron upsert against this key,
    // so re-running either is idempotent.
    await col.createIndex({ indicator: 1, timestamp: -1 }, { unique: true });
    globalThis._radarIndexesEnsured = true;
  }
  return col;
}

/** Bulk upsert IndicatorValues. Idempotent against (indicator, timestamp). */
export async function bulkUpsertValues(values: IndicatorValue[]): Promise<{ upserted: number; modified: number }> {
  if (values.length === 0) return { upserted: 0, modified: 0 };
  const col = await getIndicatorValuesCollection();
  // Batch to keep BulkWrite payloads sane (Mongo limit is 16 MB).
  const BATCH = 500;
  let upserted = 0;
  let modified = 0;
  for (let i = 0; i < values.length; i += BATCH) {
    const chunk = values.slice(i, i + BATCH);
    const ops = chunk.map(v => ({
      updateOne: {
        filter: { indicator: v.indicator, timestamp: v.timestamp },
        update: { $set: v },
        upsert: true,
      }
    }));
    const res = await col.bulkWrite(ops, { ordered: false });
    upserted += res.upsertedCount ?? 0;
    modified += res.modifiedCount ?? 0;
  }
  return { upserted, modified };
}

/** Fetch latest observation per indicator id. */
export async function getLatestByIds(ids: string[]): Promise<Map<string, IndicatorValue>> {
  const col = await getIndicatorValuesCollection();
  const cursor = col.aggregate<{ _id: string; doc: IndicatorValue }>([
    { $match: { indicator: { $in: ids } } },
    { $sort: { indicator: 1, timestamp: -1 } },
    { $group: { _id: "$indicator", doc: { $first: "$$ROOT" } } },
  ]);
  const out = new Map<string, IndicatorValue>();
  for await (const row of cursor) out.set(row._id, row.doc);
  return out;
}

/** Fetch history series since `from` for a set of indicator ids. */
export async function getHistorySince(ids: string[], from: Date): Promise<Map<string, IndicatorValue[]>> {
  const col = await getIndicatorValuesCollection();
  const cursor = col.find(
    { indicator: { $in: ids }, timestamp: { $gte: from } },
    { sort: { indicator: 1, timestamp: 1 } }
  );
  const out = new Map<string, IndicatorValue[]>();
  for await (const doc of cursor) {
    const arr = out.get(doc.indicator) ?? [];
    arr.push(doc);
    if (arr.length === 1) out.set(doc.indicator, arr);
  }
  return out;
}
