import type { IndicatorValue } from "../types";
import { indicatorsBySource } from "../indicators";
import { startOfDayUtc, isoDate } from "../dates";

const BASE = "https://api.bcra.gob.ar/estadisticas/v3.0";

// Note: BCRA's public API uses a self-signed cert in some chains. Node's fetch
// usually accepts it on Vercel; if needed we'd add an HTTPS agent. For now we trust it.

type IndexRow = { idVariable: number; descripcion: string; categoria: string; fecha: string; valor: number };
type HistoryResponse = { results: Array<{ fecha: string; valor: number }> };

/**
 * Fetches the current "Principales Variables" index, finds each registered
 * indicator's idVariable by description-pattern match, and writes the current value.
 */
export async function fetchBcraCurrent(): Promise<IndicatorValue[]> {
  const indicators = indicatorsBySource("bcra");
  const out: IndicatorValue[] = [];
  try {
    const r = await fetch(`${BASE}/Monetarias`, {
      headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.2" },
      next: { revalidate: 0 },
    });
    if (!r.ok) throw new Error(`BCRA index HTTP ${r.status}`);
    const data = (await r.json()) as { results?: IndexRow[] } | IndexRow[];
    const rows: IndexRow[] = Array.isArray(data) ? data : (data.results ?? []);
    for (const ind of indicators) {
      if (!ind.bcra) continue;
      const match = rows.find(row => ind.bcra!.pattern.test(row.descripcion || ""));
      if (!match || match.valor == null || !match.fecha) continue;
      out.push({
        indicator: ind.id,
        timestamp: startOfDayUtc(match.fecha),
        value: match.valor,
        source: "bcra",
        meta: { idVariable: match.idVariable, descripcion: match.descripcion },
      });
    }
  } catch (e) {
    console.warn("[bcra] current fetch failed:", e);
  }
  return out;
}

/**
 * For each registered BCRA indicator, find idVariable and fetch its historical series.
 */
export async function fetchBcraHistory(from: Date): Promise<IndicatorValue[]> {
  const indicators = indicatorsBySource("bcra");
  if (indicators.length === 0) return [];

  // Discover idVariable per indicator.
  let indexRows: IndexRow[] = [];
  try {
    const r = await fetch(`${BASE}/Monetarias`, {
      headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.2" },
      next: { revalidate: 0 },
    });
    if (!r.ok) throw new Error(`BCRA index HTTP ${r.status}`);
    const data = (await r.json()) as { results?: IndexRow[] } | IndexRow[];
    indexRows = Array.isArray(data) ? data : (data.results ?? []);
  } catch (e) {
    console.warn("[bcra] index discovery failed:", e);
    return [];
  }

  const out: IndicatorValue[] = [];
  const desde = isoDate(from);
  const hasta = isoDate(new Date());

  for (const ind of indicators) {
    if (!ind.bcra) continue;
    const match = indexRows.find(row => ind.bcra!.pattern.test(row.descripcion || ""));
    if (!match) {
      console.warn(`[bcra] no match for ${ind.id} pattern ${ind.bcra.pattern}`);
      continue;
    }
    try {
      // BCRA returns up to 1000 points per call; we may need to paginate by date for long ranges.
      const url = `${BASE}/Monetarias/${match.idVariable}?desde=${desde}&hasta=${hasta}&limit=1000`;
      const r = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.2" },
        next: { revalidate: 0 },
      });
      if (!r.ok) {
        console.warn(`[bcra] history HTTP ${r.status} for ${ind.id}`);
        continue;
      }
      const data = (await r.json()) as HistoryResponse | { results?: HistoryResponse["results"] };
      const rows = (data as HistoryResponse).results ?? (data as { results?: HistoryResponse["results"] }).results ?? [];
      for (const row of rows) {
        if (!row.fecha || row.valor == null) continue;
        out.push({
          indicator: ind.id,
          timestamp: startOfDayUtc(row.fecha),
          value: row.valor,
          source: "bcra",
          meta: { idVariable: match.idVariable },
        });
      }
    } catch (e) {
      console.warn(`[bcra] history failed for ${ind.id}:`, e);
    }
  }

  return out;
}
