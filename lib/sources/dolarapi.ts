import type { IndicatorValue } from "../types";

const ENDPOINT = "https://dolarapi.com/v1/dolares";

type DolarApiRow = {
  casa: string;       // "oficial" | "blue" | "bolsa" | "contadoconliqui" | "cripto" | "tarjeta" | "mayorista"
  nombre: string;
  compra: number | null;
  venta: number | null;
  fechaActualizacion: string;
};

// Map DolarAPI's `casa` to our indicator id slug for the "venta" leg.
const CASA_TO_ID: Record<string, { venta: string; compra?: string }> = {
  oficial:          { venta: "ar.dolar.oficial.venta",    compra: "ar.dolar.oficial.compra" },
  mayorista:        { venta: "ar.dolar.mayorista.venta" },
  blue:             { venta: "ar.dolar.blue.venta" },
  bolsa:            { venta: "ar.dolar.mep.venta" },
  contadoconliqui:  { venta: "ar.dolar.ccl.venta" },
  cripto:           { venta: "ar.dolar.cripto.venta" },
  tarjeta:          { venta: "ar.dolar.tarjeta.venta" },
};

export async function fetchDolarApi(): Promise<IndicatorValue[]> {
  const r = await fetch(ENDPOINT, {
    headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.1" },
    next: { revalidate: 0 },
  });
  if (!r.ok) throw new Error(`DolarAPI HTTP ${r.status}`);
  const rows = (await r.json()) as DolarApiRow[];
  const out: IndicatorValue[] = [];
  const now = new Date();
  for (const row of rows) {
    const mapping = CASA_TO_ID[row.casa];
    if (!mapping) continue;
    const ts = row.fechaActualizacion ? new Date(row.fechaActualizacion) : now;
    if (mapping.venta && row.venta != null) {
      out.push({
        indicator: mapping.venta,
        timestamp: ts,
        value: row.venta,
        source: "dolarapi",
        meta: { casa: row.casa, leg: "venta" },
      });
    }
    if (mapping.compra && row.compra != null) {
      out.push({
        indicator: mapping.compra,
        timestamp: ts,
        value: row.compra,
        source: "dolarapi",
        meta: { casa: row.casa, leg: "compra" },
      });
    }
  }
  return out;
}
