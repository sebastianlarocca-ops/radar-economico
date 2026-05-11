import { Dashboard } from "@/components/Dashboard";
import type { LatestRow } from "@/app/api/snapshots/latest/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadLatest(): Promise<LatestRow[]> {
  // Server-side fetch — relative URLs don't work in server fetches in Next 15,
  // so we go straight to the source on first paint.
  const { getIndicatorValuesCollection } = await import("@/lib/mongodb");
  const { INDICATORS } = await import("@/lib/indicators");

  try {
    const col = await getIndicatorValuesCollection();
    const ids = INDICATORS.map(i => i.id);
    const cursor = col.aggregate<{ _id: string; value: number; timestamp: Date; source: string; meta?: Record<string, unknown> }>([
      { $match: { indicator: { $in: ids } } },
      { $sort: { indicator: 1, timestamp: -1 } },
      {
        $group: {
          _id: "$indicator",
          value: { $first: "$value" },
          timestamp: { $first: "$timestamp" },
          source: { $first: "$source" },
          meta: { $first: "$meta" },
        }
      }
    ]);
    const byId = new Map<string, { value: number; timestamp: Date; source: string; meta?: Record<string, unknown> }>();
    for await (const doc of cursor) {
      byId.set(doc._id, { value: doc.value, timestamp: doc.timestamp, source: doc.source, meta: doc.meta });
    }
    return INDICATORS.map(ind => {
      const v = byId.get(ind.id);
      return {
        id: ind.id,
        label: ind.label,
        region: ind.region,
        category: ind.category,
        unit: ind.unit,
        decimals: ind.decimals,
        value: v?.value ?? null,
        timestamp: v?.timestamp ? v.timestamp.toISOString() : null,
        source: v?.source ?? null,
        meta: v?.meta ?? null,
      } as LatestRow;
    });
  } catch (e) {
    console.error("[page] failed to load latest:", e);
    return INDICATORS.map(ind => ({
      id: ind.id,
      label: ind.label,
      region: ind.region,
      category: ind.category,
      unit: ind.unit,
      decimals: ind.decimals,
      value: null,
      timestamp: null,
      source: null,
      meta: null,
    } as LatestRow));
  }
}

export default async function Page() {
  const rows = await loadLatest();
  return <Dashboard rows={rows} />;
}
