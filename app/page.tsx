import { Dashboard } from "@/components/Dashboard";
import type { LatestRow } from "@/app/api/snapshots/latest/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeriesPoint = { t: string; v: number };

async function loadData(): Promise<{
  latest: LatestRow[];
  history: Record<string, SeriesPoint[]>;
}> {
  const { getLatestByIds, getHistorySince } = await import("@/lib/mongodb");
  const { INDICATORS } = await import("@/lib/indicators");
  const { daysAgoStartOfDayUtc } = await import("@/lib/dates");

  const ids = INDICATORS.map((i) => i.id);

  try {
    const [latestMap, historyMap] = await Promise.all([
      getLatestByIds(ids),
      getHistorySince(ids, daysAgoStartOfDayUtc(365)),
    ]);

    const latest: LatestRow[] = INDICATORS.map((ind) => {
      const v = latestMap.get(ind.id);
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

    const history: Record<string, SeriesPoint[]> = {};
    for (const id of ids) {
      const arr = historyMap.get(id) ?? [];
      history[id] = arr.map((v) => ({
        t: v.timestamp.toISOString().slice(0, 10),
        v: v.value,
      }));
    }

    return { latest, history };
  } catch (e) {
    console.error("[page] failed to load data:", e);
    const latest: LatestRow[] = INDICATORS.map((ind) => ({
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
    return { latest, history: {} };
  }
}

export default async function Page() {
  const { latest, history } = await loadData();
  return <Dashboard latest={latest} history={history} />;
}
