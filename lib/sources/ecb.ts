import type { IndicatorValue, IndicatorMeta } from "../types";
import { indicatorsBySource } from "../indicators";
import { startOfDayUtc, isoDate } from "../dates";

const BASE = "https://data-api.ecb.europa.eu/service/data";

/**
 * Fetch one ECB SDW series via SDMX REST (CSV format — simpler than SDMX-JSON).
 * No API key required. Rate limits are generous for low-frequency automated use.
 */
async function fetchSeries(ind: IndicatorMeta, startPeriod?: string): Promise<IndicatorValue[]> {
  if (!ind.ecb) return [];
  const params = new URLSearchParams({ format: "csvdata", detail: "dataonly" });
  if (startPeriod) params.set("startPeriod", startPeriod);
  const url = `${BASE}/${ind.ecb.flow}/${ind.ecb.key}?${params}`;

  const r = await fetch(url, {
    headers: { Accept: "text/csv", "User-Agent": "radar-economico/0.3" },
    next: { revalidate: 0 },
  });
  if (!r.ok) throw new Error(`ECB SDW HTTP ${r.status} for ${ind.ecb.flow}/${ind.ecb.key}`);

  const text = await r.text();
  return parseCsv(text, ind);
}

function parseCsv(csv: string, ind: IndicatorMeta): IndicatorValue[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const timeIdx  = headers.indexOf("TIME_PERIOD");
  const valueIdx = headers.indexOf("OBS_VALUE");
  if (timeIdx < 0 || valueIdx < 0) return [];

  const out: IndicatorValue[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols       = lines[i].split(",");
    const timePeriod = cols[timeIdx]?.trim().replace(/"/g, "");
    const rawValue   = cols[valueIdx]?.trim().replace(/"/g, "");
    if (!timePeriod || !rawValue) continue;

    const num = parseFloat(rawValue);
    if (!isFinite(num)) continue;

    const dateStr = normalizeTimePeriod(timePeriod);
    if (!dateStr) continue;

    out.push({
      indicator: ind.id,
      timestamp: startOfDayUtc(dateStr),
      value: num,
      source: "ecb",
      meta: { flow: ind.ecb!.flow, key: ind.ecb!.key },
    });
  }
  return out;
}

/**
 * ECB TIME_PERIOD can be:
 *   "2024-03-15"  → daily
 *   "2024-03"     → monthly  → map to first of month
 *   "2024-Q1"     → quarterly → map to first day of quarter
 */
function normalizeTimePeriod(period: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return period;
  if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01`;
  const qm = period.match(/^(\d{4})-Q([1-4])$/);
  if (qm) {
    const month = (parseInt(qm[2]) - 1) * 3 + 1;
    return `${qm[1]}-${String(month).padStart(2, "0")}-01`;
  }
  return null;
}

/** Current: last available observation per indicator (lookback 60d to cover monthly release lag). */
export async function fetchEcbCurrent(): Promise<IndicatorValue[]> {
  const indicators = indicatorsBySource("ecb");
  const sinceIso   = isoDate(new Date(Date.now() - 60 * 86400000));
  const out: IndicatorValue[] = [];

  await Promise.all(indicators.map(async (ind) => {
    try {
      const series = await fetchSeries(ind, sinceIso);
      if (series.length === 0) return;
      series.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      out.push(series[series.length - 1]);
    } catch (e) {
      console.warn(`[ecb] current failed for ${ind.id}:`, e);
    }
  }));
  return out;
}

/** History: full series from `from` date. */
export async function fetchEcbHistory(from: Date): Promise<IndicatorValue[]> {
  const indicators = indicatorsBySource("ecb");
  const sinceIso   = isoDate(from);
  const out: IndicatorValue[] = [];

  await Promise.all(indicators.map(async (ind) => {
    try {
      const series = await fetchSeries(ind, sinceIso);
      out.push(...series);
    } catch (e) {
      console.warn(`[ecb] history failed for ${ind.id}:`, e);
    }
  }));
  return out;
}
