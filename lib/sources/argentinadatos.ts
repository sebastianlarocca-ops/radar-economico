import type { IndicatorValue, IndicatorMeta } from "../types";
import { INDICATORS, indicatorsBySource } from "../indicators";
import { startOfDayUtc } from "../dates";

const BASE = "https://api.argentinadatos.com";

type DatedValue = { fecha: string; valor: number | null };
type DolarRow = { casa: string; fecha: string; compra: number | null; venta: number | null };

/**
 * "Current" for ArgentinaDatos: the latest entry per registered indicator.
 * Covers `source=argentinadatos` only (riesgo país, IPC). AR FX uses DolarAPI for current.
 */
export async function fetchArgentinaDatosCurrent(): Promise<IndicatorValue[]> {
  const out: IndicatorValue[] = [];
  const indicators = indicatorsBySource("argentinadatos");

  for (const ind of indicators) {
    const cfg = ind.argentinadatos;
    if (!cfg) continue;
    try {
      const path = pathForArgDatosIndicator(ind);
      if (!path) continue;
      const data = await fetchJson<DatedValue[] | { fecha: string; valor: number }>(BASE + path);
      if (Array.isArray(data)) {
        const sorted = [...data].filter(d => d.fecha && d.valor != null).sort((a, b) => a.fecha.localeCompare(b.fecha));
        const last = sorted[sorted.length - 1];
        if (last) {
          out.push({
            indicator: ind.id,
            timestamp: startOfDayUtc(last.fecha),
            value: last.valor as number,
            source: "argentinadatos",
          });
        }
      } else if (data && typeof data === "object" && data.fecha && (data as DatedValue).valor != null) {
        const v = data as DatedValue;
        out.push({
          indicator: ind.id,
          timestamp: startOfDayUtc(v.fecha),
          value: v.valor as number,
          source: "argentinadatos",
        });
      }
    } catch (e) {
      console.warn(`[argentinadatos] current failed for ${ind.id}:`, e);
    }
  }
  return out;
}

/**
 * Historical series since `from`.
 * Covers:
 *  - indicators with source=argentinadatos (riesgo país, IPC)
 *  - indicators with source=dolarapi (AR FX) — using /v1/cotizaciones/dolares/{casa} since DolarAPI has no history endpoint
 */
export async function fetchArgentinaDatosHistory(from: Date): Promise<IndicatorValue[]> {
  const out: IndicatorValue[] = [];
  const fromIso = from.toISOString().slice(0, 10);

  // 1) AR macro indicators owned by ArgentinaDatos
  for (const ind of indicatorsBySource("argentinadatos")) {
    const path = pathForArgDatosIndicator(ind);
    if (!path) continue;
    try {
      const data = await fetchJson<DatedValue[]>(BASE + path);
      if (!Array.isArray(data)) continue;
      for (const row of data) {
        if (!row.fecha || row.valor == null) continue;
        if (row.fecha < fromIso) continue;
        out.push({
          indicator: ind.id,
          timestamp: startOfDayUtc(row.fecha),
          value: row.valor,
          source: "argentinadatos",
        });
      }
    } catch (e) {
      console.warn(`[argentinadatos] history failed for ${ind.id}:`, e);
    }
  }

  // 2) AR FX indicators (source=dolarapi) — historical from ArgentinaDatos
  const fxByCasa = new Map<string, IndicatorMeta[]>();
  for (const ind of INDICATORS) {
    if (ind.source !== "dolarapi" || !ind.dolarapi?.casa) continue;
    const arr = fxByCasa.get(ind.dolarapi.casa) ?? [];
    arr.push(ind);
    fxByCasa.set(ind.dolarapi.casa, arr);
  }

  for (const [casa, inds] of fxByCasa) {
    const path = `/v1/cotizaciones/dolares/${casa}`;
    try {
      const data = await fetchJson<DolarRow[]>(BASE + path);
      if (!Array.isArray(data)) continue;
      for (const row of data) {
        if (!row.fecha) continue;
        if (row.fecha < fromIso) continue;
        for (const ind of inds) {
          const leg = ind.dolarapi!.leg;
          const v = leg === "venta" ? row.venta : row.compra;
          if (v == null) continue;
          out.push({
            indicator: ind.id,
            timestamp: startOfDayUtc(row.fecha),
            value: v,
            source: "argentinadatos",
            meta: { casa, leg, backfill: true },
          });
        }
      }
    } catch (e) {
      console.warn(`[argentinadatos] dolar history failed for casa ${casa}:`, e);
    }
  }

  return out;
}

function pathForArgDatosIndicator(ind: IndicatorMeta): string | null {
  const cfg = ind.argentinadatos;
  if (!cfg) return null;
  if (cfg.type === "riesgo_pais") return "/v1/finanzas/indices/riesgo-pais";
  if (cfg.type === "ipc") return "/v1/finanzas/indices/inflacion";
  if (cfg.type === "dolar" && cfg.dolar_casa) return `/v1/cotizaciones/dolares/${cfg.dolar_casa}`;
  return null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const r = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.2" },
    next: { revalidate: 0 },
  });
  if (!r.ok) {
    console.warn(`[argentinadatos] HTTP ${r.status} for ${url}`);
    return null;
  }
  return (await r.json()) as T;
}
