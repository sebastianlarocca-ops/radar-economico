import { NextRequest, NextResponse } from "next/server";
import { getHistorySince } from "@/lib/mongodb";
import { INDICATORS } from "@/lib/indicators";
import { daysAgoStartOfDayUtc, startOfDayUtc } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeriesPoint = { t: string; v: number };
type ResponseBody = {
  ok: boolean;
  fromIso: string;
  count: number;
  series: Record<string, SeriesPoint[]>;
};

/**
 * GET /api/snapshots/history?days=90&indicators=ar.dolar.oficial.venta,crypto.btc.usd
 * - days: lookback window in days (default 90)
 * - from: alternative to days; ISO date YYYY-MM-DD
 * - indicators: comma-separated indicator ids (default = all registered)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const indicatorsParam = url.searchParams.get("indicators");
    const ids = indicatorsParam
      ? indicatorsParam.split(",").map(s => s.trim()).filter(Boolean)
      : INDICATORS.map(i => i.id);

    const fromIso = url.searchParams.get("from");
    let from: Date;
    if (fromIso) {
      from = startOfDayUtc(fromIso);
    } else {
      const days = parseInt(url.searchParams.get("days") || "90", 10);
      from = daysAgoStartOfDayUtc(Number.isFinite(days) ? days : 90);
    }

    const map = await getHistorySince(ids, from);
    const series: Record<string, SeriesPoint[]> = {};
    let count = 0;
    for (const id of ids) {
      const arr = map.get(id) ?? [];
      series[id] = arr.map(v => ({ t: v.timestamp.toISOString().slice(0, 10), v: v.value }));
      count += arr.length;
    }
    const body: ResponseBody = {
      ok: true,
      fromIso: from.toISOString().slice(0, 10),
      count,
      series,
    };
    return NextResponse.json(body);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export type HistoryResponse = ResponseBody;
