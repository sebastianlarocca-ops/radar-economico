import { NextResponse } from "next/server";
import { getIndicatorValuesCollection } from "@/lib/mongodb";
import { INDICATORS } from "@/lib/indicators";
import type { IndicatorValue } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type LatestRow = {
  id: string;
  label: string;
  region: IndicatorValue extends { region: infer R } ? R : string;
  category: string;
  unit: string;
  decimals?: number;
  value: number | null;
  timestamp: string | null;
  source: string | null;
  meta?: Record<string, unknown> | null;
};

export async function GET() {
  try {
    const col = await getIndicatorValuesCollection();
    const ids = INDICATORS.map(i => i.id);
    // For each indicator, fetch the most recent observation.
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
    const rows = INDICATORS.map(ind => {
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
      };
    });
    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
