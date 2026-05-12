import type { IndicatorValue } from "../types";
import { indicatorsBySource } from "../indicators";
import { startOfDayUtc } from "../dates";

const ENDPOINT = "https://dolarapi.com/v1/dolares";

type DolarApiRow = {
  casa: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  fechaActualizacion: string;
};

/**
 * Current snapshot for every dolar indicator configured in the registry.
 * DolarAPI has no history endpoint — we use ArgentinaDatos for that.
 */
export async function fetchDolarApiCurrent(): Promise<IndicatorValue[]> {
  const r = await fetch(ENDPOINT, {
    headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.2" },
    next: { revalidate: 0 },
  });
  if (!r.ok) throw new Error(`DolarAPI HTTP ${r.status}`);
  const rows = (await r.json()) as DolarApiRow[];

  const byCasa: Record<string, DolarApiRow> = {};
  for (const row of rows) if (row && row.casa) byCasa[row.casa] = row;

  const indicators = indicatorsBySource("dolarapi");
  const out: IndicatorValue[] = [];
  for (const ind of indicators) {
    const cfg = ind.dolarapi;
    if (!cfg) continue;
    const row = byCasa[cfg.casa];
    if (!row) continue;
    const value = cfg.leg === "venta" ? row.venta : row.compra;
    if (value == null) continue;
    const ts = row.fechaActualizacion ? new Date(row.fechaActualizacion) : new Date();
    out.push({
      indicator: ind.id,
      timestamp: startOfDayUtc(ts),
      value,
      source: "dolarapi",
      meta: { casa: cfg.casa, leg: cfg.leg, fetched_at: new Date().toISOString() },
    });
  }
  return out;
}
