import type { IndicatorValue, IndicatorMeta } from "../types";
import { indicatorsBySource } from "../indicators";
import { startOfDayUtc, isoDate } from "../dates";

const BASE = "https://api.stlouisfed.org/fred";

type FredObservation = { date: string; value: string };
type FredObservationsResponse = { observations: FredObservation[] };

function apiKey(): string {
  const k = process.env.FRED_API_KEY;
  if (!k) throw new Error("FRED_API_KEY not configured");
  return k;
}

/** Fetch one FRED series — used by both current and history flows. */
async function fetchSeries(ind: IndicatorMeta, observationStart?: string): Promise<IndicatorValue[]> {
  if (!ind.fred) return [];
  const params = new URLSearchParams({
    series_id: ind.fred.series_id,
    api_key: apiKey(),
    file_type: "json",
  });
  if (ind.fred.units) params.set("units", ind.fred.units);
  if (observationStart) params.set("observation_start", observationStart);

  const url = `${BASE}/series/observations?${params}`;
  const r = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.2" },
    next: { revalidate: 0 },
  });
  if (!r.ok) throw new Error(`FRED HTTP ${r.status} for ${ind.fred.series_id}`);
  const data = (await r.json()) as FredObservationsResponse;
  const out: IndicatorValue[] = [];
  for (const obs of data.observations ?? []) {
    if (!obs.date) continue;
    const num = parseFloat(obs.value);
    if (!isFinite(num)) continue; // FRED uses "." for missing
    out.push({
      indicator: ind.id,
      timestamp: startOfDayUtc(obs.date),
      value: num,
      source: "fred",
      meta: { series_id: ind.fred.series_id, units: ind.fred.units ?? "lin" },
    });
  }
  return out;
}

/** Current: just take the latest observation for each FRED-sourced indicator. */
export async function fetchFredCurrent(): Promise<IndicatorValue[]> {
  const indicators = indicatorsBySource("fred");
  const out: IndicatorValue[] = [];
  // Look back 60 days to handle FRED's release lag (e.g. CPI releases ~14 days after end of month).
  const sinceIso = isoDate(new Date(Date.now() - 60 * 86400000));
  await Promise.all(indicators.map(async ind => {
    try {
      const series = await fetchSeries(ind, sinceIso);
      if (series.length === 0) return;
      series.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      out.push(series[series.length - 1]);
    } catch (e) {
      console.warn(`[fred] current failed for ${ind.id}:`, e);
    }
  }));
  return out;
}

/** History: full series since `from`. */
export async function fetchFredHistory(from: Date): Promise<IndicatorValue[]> {
  const indicators = indicatorsBySource("fred");
  const sinceIso = isoDate(from);
  const out: IndicatorValue[] = [];
  // FRED free tier allows parallel calls comfortably.
  await Promise.all(indicators.map(async ind => {
    try {
      const series = await fetchSeries(ind, sinceIso);
      out.push(...series);
    } catch (e) {
      console.warn(`[fred] history failed for ${ind.id}:`, e);
    }
  }));
  return out;
}
