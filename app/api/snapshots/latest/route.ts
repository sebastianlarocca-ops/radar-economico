import { NextResponse } from "next/server";
import { getLatestByIds } from "@/lib/mongodb";
import { INDICATORS } from "@/lib/indicators";
import type { Region } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type LatestRow = {
  id: string;
  label: string;
  region: Region;
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
    const ids = INDICATORS.map(i => i.id);
    const map = await getLatestByIds(ids);
    const rows: LatestRow[] = INDICATORS.map(ind => {
      const v = map.get(ind.id);
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
