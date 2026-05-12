"use client";

import { useState, useEffect, useCallback } from "react";
import { Tile } from "./Tile";
import { Section } from "./Section";
import { RangeSelector, type RangeDays } from "./RangeSelector";
import { LineChart, BarChart, type DataPoint } from "./charts";
import { InfoTooltip } from "./InfoTooltip";
import type { LatestRow } from "@/app/api/snapshots/latest/route";
import type { HistoryResponse } from "@/app/api/snapshots/history/route";

const COLORS = {
  mayorista: "#1e3a8a",
  oficial: "#2563eb",
  tarjeta: "#9ca3af",
  blue: "#16a34a",
  mep: "#d97706",
  ccl: "#dc2626",
  cripto: "#7c3aed",
  btc: "#f7931a",
  eth: "#6b7fea",
  riesgo: "#b91c1c",
  ipc: "#be123c",
  tasa: "#0891b2",
  reservas: "#0f766e",
  base: "#6d28d9",
  fedFunds: "#1d4ed8",
  ust10: "#7c3aed",
  cpi: "#dc2626",
  unrate: "#d97706",
  nfp: "#16a34a",
  dxy: "#0f172a",
  cnCpi: "#b45309",
  cnPpi: "#92400e",
  cnFx: "#dc2626",
  cnPmi: "#15803d",
};

// Stale threshold (days) per indicator — shown as amber badge on Tile
const STALE_DAYS: Record<string, number> = {
  "ar.dolar.oficial.venta":   2, "ar.dolar.oficial.compra":  2,
  "ar.dolar.mayorista.venta": 2, "ar.dolar.blue.venta":      2,
  "ar.dolar.mep.venta":       2, "ar.dolar.ccl.venta":       2,
  "ar.dolar.cripto.venta":    2, "ar.dolar.tarjeta.venta":   2,
  "ar.riesgo_pais":           2,
  "ar.ipc.mensual":          45,
  "ar.bcra.tasa_politica":    7, "ar.bcra.reservas":         7, "ar.bcra.base_monetaria": 7,
  "crypto.btc.usd":           2, "crypto.eth.usd":           2,
  "us.fed_funds.upper":       7, "us.ust.dgs10":             2,
  "us.cpi.yoy":              45, "us.unrate":               45, "us.payems": 45,
  "us.dxy_broad":             2,
  "cn.cpi.yoy":              45, "cn.fx.usdcny":             2,
};

// Plain-language descriptions for each indicator
const INFO: Record<string, string> = {
  "ar.dolar.oficial.venta":     "Tipo de cambio oficial publicado por el BNA. Es el precio al que el banco vende dólares al público.",
  "ar.dolar.oficial.compra":    "Precio al que el BNA compra dólares al público.",
  "ar.dolar.mayorista.venta":   "Dólar de referencia para operaciones comerciales de gran volumen entre empresas y bancos.",
  "ar.dolar.blue.venta":        "Precio en el mercado informal (paralelo). Refleja la demanda de dólares fuera del sistema bancario.",
  "ar.dolar.mep.venta":         "Dólar 'Bolsa': se obtiene comprando un bono en pesos y vendiéndolo en dólares dentro del país. Legal.",
  "ar.dolar.ccl.venta":         "Contado con liquidación: similar al MEP pero el bono se vende en el exterior. Referencia de convertibilidad real.",
  "ar.dolar.cripto.venta":      "Precio del USDT en pesos. Funciona como referencia del dólar en el mercado cripto.",
  "ar.dolar.tarjeta.venta":     "Dólar oficial más el impuesto PAIS (hasta 2024) y percepción de Ganancias. El que pagás con tarjeta en el exterior.",
  "ar.riesgo_pais":             "EMBI+: mide cuánto más rinde un bono argentino vs un bono del Tesoro de EE.UU. Más puntos = mercado percibe más riesgo de default.",
  "ar.ipc.mensual":             "Variación del Índice de Precios al Consumidor en un mes. Dato oficial del INDEC. Mide la inflación mensual.",
  "ar.bcra.tasa_politica":      "Tasa overnight de pases entre entidades (O/N). Refleja el piso del corredor de tasas del BCRA desde la transición al esquema LEFI en jul-2025.",
  "ar.bcra.reservas":           "Activos del BCRA en moneda extranjera. Clave para la estabilidad cambiaria y el pago de deuda externa. En millones de USD.",
  "ar.bcra.base_monetaria":     "Total de pesos emitidos por el BCRA. Incluye billetes en circulación y depósitos bancarios en el BCRA.",
  "crypto.btc.usd":             "Precio de mercado de Bitcoin en dólares. Activo digital descentralizado, oferta máxima de 21 millones.",
  "crypto.eth.usd":             "Precio de mercado de Ethereum en dólares. Plataforma de contratos inteligentes y base del ecosistema DeFi.",
  "us.fed_funds.upper":         "Tasa objetivo de la Reserva Federal (Fed). Afecta el costo del crédito en todo el mundo. Más alta = dólar más fuerte, presión sobre emergentes.",
  "us.ust.dgs10":               "Rendimiento del bono del Tesoro de EE.UU. a 10 años. Referencia global del 'activo libre de riesgo'. Sube cuando el mercado espera más inflación o déficit.",
  "us.cpi.yoy":                 "Inflación interanual de EE.UU. (variación de precios en los últimos 12 meses). Dato clave para las decisiones de la Fed.",
  "us.unrate":                  "Porcentaje de la fuerza laboral sin empleo en EE.UU. Mercado laboral fuerte = Fed puede mantener tasas altas.",
  "us.payems":                  "Nonfarm Payrolls: empleos creados fuera del sector agrícola. Principal termómetro mensual del mercado laboral de EE.UU.",
  "us.dxy_broad":               "Índice del dólar frente a una canasta amplia de monedas. Sube cuando el dólar se fortalece globalmente.",
  "cn.cpi.yoy":                 "Inflación interanual de China. Refleja presiones de demanda interna. El PBOC la monitorea para calibrar política monetaria.",
  "cn.ppi.yoy":                 "Inflación mayorista en China. Indicador adelantado de presiones de costos que luego se trasladan al consumidor global.",
  "cn.fx.usdcny":               "Yuan chino por dólar. Un CNY más débil (número mayor) abarata exportaciones chinas. El PBOC fija un tipo de referencia diario.",
  "cn.pmi.caixin":              "PMI manufacturero de Caixin/S&P para China. Por encima de 50 = expansión. Refleja el pulso de la fábrica del mundo.",
  // Derived
  "derived.btc.ars":            "Bitcoin expresado en pesos argentinos. Se calcula multiplicando el precio de BTC en USD por el tipo de cambio USDT/ARS (dólar cripto).",
  "derived.brecha.cripto_blue": "Diferencia porcentual entre el dólar cripto (USDT) y el dólar blue. Positivo = USDT cotiza por encima del blue.",
  "derived.brecha.cripto_ccl":  "Diferencia porcentual entre el dólar cripto (USDT) y el CCL. Positivo = USDT cotiza por encima del CCL.",
};

// Chart-level descriptions
const CHART_INFO: Record<string, string> = {
  "dolar-evolucion":  "Muestra cómo evolucionó el precio de venta de cada tipo de dólar en el período seleccionado.",
  "brecha":           "Diferencia porcentual de cada cotización vs el dólar oficial. Mide la distorsión del mercado cambiario.",
  "riesgo":           "Evolución del EMBI+ Argentina. Cae cuando el mercado percibe menos riesgo de default.",
  "ipc-chart":        "Inflación mensual registrada por el INDEC. Cada barra es un mes.",
  "bcra-variables":   "Evolución de la tasa overnight de pases entre terceros (O/N). Proxy de la tasa de referencia desde la transición al esquema LEFI.",
  "crypto-chart":     "Precio de BTC (eje izquierdo) y ETH (eje derecho) en dólares. Ejes separados por la diferencia de escala.",
  "fed-rates":        "Evolución de la tasa Fed Funds y el rendimiento del bono del Tesoro a 10 años.",
  "us-cpi":           "Inflación interanual de EE.UU. Dato mensual — se actualiza una vez al mes.",
  "cn-fx":            "Evolución del tipo de cambio USD/CNY. Sube cuando el yuan se deprecia frente al dólar.",
  "cn-prices":        "CPI e IPC mayorista (PPI) de China en variación interanual. Fuente: FRED (datos oficiales chinos vía OCDE).",
};

type SeriesMap = Record<string, DataPoint[]>;

function byId(rows: LatestRow[], id: string): LatestRow | undefined {
  return rows.find((r) => r.id === id);
}

function byIds(rows: LatestRow[], ids: string[]): LatestRow[] {
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => { const r = map.get(id); return r ? [r] : []; });
}

function filterRange(points: DataPoint[], rangeDays: RangeDays): DataPoint[] {
  if (!points || points.length === 0) return [];
  if (rangeDays === "max") return points;
  const cutoff = new Date(Date.now() - rangeDays * 86400000).toISOString().slice(0, 10);
  return points.filter((p) => p.t >= cutoff);
}

function brecha(oficial: number | null, other: number | null): string {
  if (!oficial || !other) return "—";
  const v = (other / oficial - 1) * 100;
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

function fmtARS(v: number | null, decimals = 0): string {
  if (v == null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    maximumFractionDigits: decimals, minimumFractionDigits: decimals,
  }).format(v);
}

function fmtDate(ts: string | null): string {
  if (!ts) return "—";
  const dt = new Date(ts);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ChartBox({
  title,
  hint,
  infoKey,
  children,
  noData,
}: {
  title: string;
  hint?: string;
  infoKey?: string;
  children: React.ReactNode;
  noData?: boolean;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">{title}</span>
          {infoKey && CHART_INFO[infoKey] && <InfoTooltip text={CHART_INFO[infoKey]} />}
        </div>
        {hint && <span className="text-[11px] text-[var(--muted)]">{hint}</span>}
      </div>
      {noData ? (
        <div className="flex items-center justify-center h-[60px] text-[12px] text-[var(--muted)]">
          Acumulando historial · los datos aparecerán con el correr de los días
        </div>
      ) : children}
    </div>
  );
}

export function DashboardClient({
  latest,
  initialHistory,
}: {
  latest: LatestRow[];
  initialHistory: SeriesMap;
}) {
  const [rangeDays, setRangeDays] = useState<RangeDays>(90);
  const [history, setHistory] = useState<SeriesMap>(initialHistory);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (days: RangeDays) => {
    const needed = days === "max" ? 3650 : days;
    const oldest = Object.values(history).flat().map((p) => p.t).sort()[0];
    const cutoff = new Date(Date.now() - needed * 86400000).toISOString().slice(0, 10);
    if (oldest && oldest <= cutoff) return;
    setLoading(true);
    try {
      const daysParam = days === "max" ? 3650 : days;
      const res = await fetch(`/api/snapshots/history?days=${daysParam}`);
      if (res.ok) {
        const data = (await res.json()) as HistoryResponse;
        setHistory(data.series);
      }
    } finally {
      setLoading(false);
    }
  }, [history]);

  useEffect(() => {
    fetchHistory(rangeDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  // spark: returns range-filtered data, falls back to full available history if < 2 points
  const spark = (id: string): DataPoint[] => {
    const all = history[id] ?? [];
    const filtered = filterRange(all, rangeDays);
    return filtered.length >= 2 ? filtered : all.slice(-180);
  };

  const sparkFiltered = (id: string): DataPoint[] => filterRange(history[id] ?? [], rangeDays);

  const oficialVenta = byId(latest, "ar.dolar.oficial.venta")?.value ?? null;
  const cclVenta    = byId(latest, "ar.dolar.ccl.venta")?.value ?? null;
  const blueVenta   = byId(latest, "ar.dolar.blue.venta")?.value ?? null;
  const criptoRow   = byId(latest, "ar.dolar.cripto.venta");
  const criptoVenta = criptoRow?.value ?? null;
  const btcRow      = byId(latest, "crypto.btc.usd");

  function brechaVal(a: number | null, b: number | null): number | null {
    if (!a || !b) return null;
    return +((a / b - 1) * 100).toFixed(1);
  }

  // Derived rows (computed client-side, not in DB)
  const btcArsValue = btcRow?.value && criptoVenta ? Math.round(btcRow.value * criptoVenta) : null;
  const btcArsRow: LatestRow = {
    id: "derived.btc.ars", label: "Bitcoin (ARS)",
    region: "GLOBAL", category: "crypto", unit: "ARS", decimals: 0,
    value: btcArsValue, timestamp: btcRow?.timestamp ?? null, source: "derivado", meta: null,
  };
  const brechaBlueRow: LatestRow = {
    id: "derived.brecha.cripto_blue", label: "USDT vs Blue",
    region: "AR", category: "fx", unit: "PCT", decimals: 1,
    value: brechaVal(criptoVenta, blueVenta), timestamp: criptoRow?.timestamp ?? null, source: "derivado", meta: null,
  };
  const brechaCclRow: LatestRow = {
    id: "derived.brecha.cripto_ccl", label: "USDT vs CCL",
    region: "AR", category: "fx", unit: "PCT", decimals: 1,
    value: brechaVal(criptoVenta, cclVenta), timestamp: criptoRow?.timestamp ?? null, source: "derivado", meta: null,
  };

  const lastUpdate = latest.map((r) => r.timestamp).filter((t): t is string => !!t).sort().pop() ?? null;

  // --- Tiles principales ---
  const tilesPrincipales = byIds(latest, [
    "ar.dolar.oficial.venta", "ar.dolar.ccl.venta", "ar.dolar.blue.venta",
    "ar.riesgo_pais", "crypto.btc.usd", "crypto.eth.usd",
  ]);

  const tileColors: Record<string, string> = {
    "ar.dolar.oficial.venta": COLORS.oficial,
    "ar.dolar.ccl.venta": COLORS.ccl,
    "ar.dolar.blue.venta": COLORS.blue,
    "ar.riesgo_pais": COLORS.riesgo,
    "crypto.btc.usd": COLORS.btc,
    "crypto.eth.usd": COLORS.eth,
  };

  const tileSubs: Record<string, string> = {
    "ar.dolar.ccl.venta": `brecha ${brecha(oficialVenta, cclVenta)}`,
    "ar.dolar.blue.venta": `brecha ${brecha(oficialVenta, blueVenta)}`,
  };

  // --- Dolar table ---
  const dolarTableRows = [
    { id: "ar.dolar.mayorista.venta", label: "Mayorista (A3500)" },
    { id: "ar.dolar.oficial.venta",   label: "Oficial (BNA)" },
    { id: "ar.dolar.tarjeta.venta",   label: "Tarjeta" },
    { id: "ar.dolar.blue.venta",      label: "Blue" },
    { id: "ar.dolar.mep.venta",       label: "MEP" },
    { id: "ar.dolar.ccl.venta",       label: "CCL" },
    { id: "ar.dolar.cripto.venta",    label: "Cripto (USDT)" },
  ];

  // --- Dolar charts ---
  const dolarChartDatasets = [
    { label: "Mayorista", data: spark("ar.dolar.mayorista.venta"), color: COLORS.mayorista },
    { label: "Oficial",   data: spark("ar.dolar.oficial.venta"),   color: COLORS.oficial },
    { label: "Blue",      data: spark("ar.dolar.blue.venta"),      color: COLORS.blue },
    { label: "MEP",       data: spark("ar.dolar.mep.venta"),       color: COLORS.mep },
    { label: "CCL",       data: spark("ar.dolar.ccl.venta"),       color: COLORS.ccl },
    { label: "Cripto",    data: spark("ar.dolar.cripto.venta"),    color: COLORS.cripto },
  ].filter((d) => d.data.length >= 2);

  const oficialSeries = spark("ar.dolar.oficial.venta");
  const oficialByDate = new Map(oficialSeries.map((p) => [p.t, p.v]));
  function brechaDataset(id: string, label: string, color: string) {
    const data = spark(id).map((p) => {
      const of = oficialByDate.get(p.t);
      if (!of) return null;
      return { t: p.t, v: +((p.v / of - 1) * 100).toFixed(2) };
    }).filter((p): p is DataPoint => p !== null);
    return { label, data, color };
  }
  const brechaDatasets = [
    brechaDataset("ar.dolar.blue.venta",   "Blue",   COLORS.blue),
    brechaDataset("ar.dolar.mep.venta",    "MEP",    COLORS.mep),
    brechaDataset("ar.dolar.ccl.venta",    "CCL",    COLORS.ccl),
    brechaDataset("ar.dolar.cripto.venta", "Cripto", COLORS.cripto),
  ].filter((d) => d.data.length >= 2);

  // --- Macro AR ---
  const macroTiles = byIds(latest, ["ar.ipc.mensual", "ar.riesgo_pais"]);
  const bcraTiles  = byIds(latest, ["ar.bcra.tasa_politica", "ar.bcra.reservas", "ar.bcra.base_monetaria"]);

  // --- Crypto ---
  const cryptoTiles = byIds(latest, ["crypto.btc.usd", "crypto.eth.usd"]);
  const btcData = spark("crypto.btc.usd");
  const ethData = spark("crypto.eth.usd");
  const cryptoHasHistory = btcData.length >= 2 || ethData.length >= 2;
  const cryptoDatasets = [
    { label: "BTC/USD", data: btcData, color: COLORS.btc, yAxisID: "y" },
    { label: "ETH/USD", data: ethData, color: COLORS.eth, yAxisID: "y1" },
  ].filter((d) => d.data.length >= 2);

  const btcArsSparkline = (() => {
    const criptoMap = new Map(spark("ar.dolar.cripto.venta").map((p) => [p.t, p.v]));
    return spark("crypto.btc.usd").flatMap((p) => {
      const usdt = criptoMap.get(p.t);
      return usdt ? [{ t: p.t, v: Math.round(p.v * usdt) }] : [];
    });
  })();

  // --- USA ---
  const usTiles = byIds(latest, [
    "us.fed_funds.upper", "us.ust.dgs10", "us.cpi.yoy",
    "us.unrate", "us.payems", "us.dxy_broad",
  ]);
  const usColors: Record<string, string> = {
    "us.fed_funds.upper": COLORS.fedFunds,
    "us.ust.dgs10":       COLORS.ust10,
    "us.cpi.yoy":         COLORS.cpi,
    "us.unrate":          COLORS.unrate,
    "us.payems":          COLORS.nfp,
    "us.dxy_broad":       COLORS.dxy,
  };
  const usRatesDatasets = [
    { label: "Fed Funds", data: spark("us.fed_funds.upper"), color: COLORS.fedFunds },
    { label: "UST 10Y",   data: spark("us.ust.dgs10"),       color: COLORS.ust10 },
  ].filter((d) => d.data.length >= 2);
  const cpiData = spark("us.cpi.yoy");

  return (
    <main className="px-3.5 py-4 pb-10 max-w-screen-xl mx-auto">
      <header className="mb-4">
        <h1 className="text-[20px] font-semibold tracking-tight">Radar Económico</h1>
        <div className="text-[12px] text-[var(--muted)] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Argentina · USA · Eurozona · China</span>
          <span>·</span>
          <span>Última actualización: <span className="num">{lastUpdate ? fmtDate(lastUpdate) : "—"}</span></span>
          {loading && <span className="text-[var(--warn)]">cargando...</span>}
        </div>
        <RangeSelector value={rangeDays} onChange={setRangeDays} />
      </header>

      {/* TILES PRINCIPALES */}
      <Section title="Tiles principales" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {tilesPrincipales.map((r) => (
            <Tile
              key={r.id} row={r}
              sub={tileSubs[r.id]}
              sparkline={spark(r.id)} sparkColor={tileColors[r.id]}
              info={INFO[r.id]}
              staleAfterDays={STALE_DAYS[r.id]}
            />
          ))}
        </div>
      </Section>

      {/* AR · DÓLAR Y BRECHA */}
      <Section title="🇦🇷 Argentina · Dólar y brecha" chip={{ text: "en vivo", tone: "live" }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden text-[13px]">
            <thead>
              <tr>
                {["Cotización", "Venta", "Brecha vs oficial"].map((h, i) => (
                  <th key={h} className={`px-2.5 py-2 text-[10.5px] uppercase tracking-wider font-bold text-[var(--muted)] bg-[var(--chip-bg)] border-b border-[var(--border)] ${i > 0 ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dolarTableRows.map(({ id, label }) => {
                const row = byId(latest, id);
                const venta = row?.value ?? null;
                const br = id !== "ar.dolar.oficial.venta" && id !== "ar.dolar.mayorista.venta"
                  ? brecha(oficialVenta, venta) : "—";
                const brColor = br !== "—" && br.startsWith("+") ? "text-[var(--pos)]"
                  : br !== "—" ? "text-[var(--neg)]" : "text-[var(--muted)]";
                return (
                  <tr key={id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-2.5 py-2">
                      <span className="flex items-center gap-1">
                        {label}
                        {INFO[id] && <InfoTooltip text={INFO[id]} />}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-right num">{fmtARS(venta)}</td>
                    <td className={`px-2.5 py-2 text-right num font-medium ${brColor}`}>{br}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {dolarChartDatasets.length >= 1 && (
          <ChartBox title="Evolución del dólar" hint="ARS por USD · venta" infoKey="dolar-evolucion">
            <LineChart datasets={dolarChartDatasets} />
          </ChartBox>
        )}

        {brechaDatasets.length >= 1 && (
          <ChartBox title="Brecha cambiaria vs oficial" hint="% sobre oficial" infoKey="brecha">
            <LineChart datasets={brechaDatasets} />
          </ChartBox>
        )}

        {(brechaBlueRow.value !== null || brechaCclRow.value !== null) && (
          <div className="mt-3">
            <div className="text-[10.5px] uppercase tracking-wider font-bold text-[var(--muted)] mb-2">
              Brecha cripto (USDT)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Tile row={brechaBlueRow} info={INFO["derived.brecha.cripto_blue"]} />
              <Tile row={brechaCclRow}  info={INFO["derived.brecha.cripto_ccl"]} />
            </div>
          </div>
        )}
      </Section>

      {/* AR · MACRO */}
      <Section title="🇦🇷 Argentina · Macro" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {macroTiles.map((r) => (
            <Tile key={r.id} row={r}
              sparkline={spark(r.id)}
              sparkColor={r.id === "ar.riesgo_pais" ? COLORS.riesgo : COLORS.ipc}
              info={INFO[r.id]}
              staleAfterDays={STALE_DAYS[r.id]}
            />
          ))}
        </div>

        {spark("ar.riesgo_pais").length >= 2 && (
          <ChartBox title="Riesgo país" hint="EMBI+ AR · puntos básicos" infoKey="riesgo">
            <LineChart datasets={[{ label: "Riesgo país", data: spark("ar.riesgo_pais"), color: COLORS.riesgo }]} />
          </ChartBox>
        )}

        {spark("ar.ipc.mensual").length >= 2 && (
          <ChartBox title="Inflación mensual" hint="INDEC · % m/m" infoKey="ipc-chart">
            <BarChart data={spark("ar.ipc.mensual")} color={COLORS.ipc} />
          </ChartBox>
        )}
      </Section>

      {/* AR · BCRA */}
      <Section title="🇦🇷 Argentina · BCRA" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {bcraTiles.map((r) => {
            const c = r.id === "ar.bcra.tasa_politica" ? COLORS.tasa
              : r.id === "ar.bcra.reservas" ? COLORS.reservas : COLORS.base;
            return <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={c} info={INFO[r.id]} staleAfterDays={STALE_DAYS[r.id]} />;
          })}
        </div>

        <ChartBox
          title="Tasa pases O/N"
          hint="% · BCRA"
          infoKey="bcra-variables"
          noData={spark("ar.bcra.tasa_politica").length < 2}
        >
          <LineChart datasets={[{ label: "Tasa O/N", data: spark("ar.bcra.tasa_politica"), color: COLORS.tasa }]} />
        </ChartBox>
      </Section>

      {/* CRIPTO */}
      <Section title="₿ Cripto" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {cryptoTiles.map((r) => (
            <Tile key={r.id} row={r}
              sparkline={spark(r.id)}
              sparkColor={r.id === "crypto.btc.usd" ? COLORS.btc : COLORS.eth}
              info={INFO[r.id]}
              staleAfterDays={STALE_DAYS[r.id]}
            />
          ))}
          {btcArsRow.value !== null && (
            <Tile row={btcArsRow}
              sparkline={btcArsSparkline}
              sparkColor={COLORS.btc}
              info={INFO["derived.btc.ars"]}
            />
          )}
        </div>

        <ChartBox title="BTC y ETH" hint="USD · ejes separados" infoKey="crypto-chart" noData={!cryptoHasHistory}>
          {cryptoDatasets.length >= 1 && <LineChart datasets={cryptoDatasets} yAxisLabel="BTC" yAxisLabelRight="ETH" />}
        </ChartBox>
      </Section>

      {/* USA */}
      <Section title="🇺🇸 USA" chip={{ text: "FRED", tone: "live" }}>
        {usTiles.some((r) => r.value !== null) ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {usTiles.map((r) => (
                <Tile key={r.id} row={r}
                  sparkline={spark(r.id)} sparkColor={usColors[r.id]}
                  info={INFO[r.id]}
                  staleAfterDays={STALE_DAYS[r.id]}
                />
              ))}
            </div>

            {usRatesDatasets.length >= 1 && (
              <ChartBox title="Fed Funds y UST 10Y" hint="% anual" infoKey="fed-rates">
                <LineChart datasets={usRatesDatasets} />
              </ChartBox>
            )}

            <ChartBox
              title="CPI YoY"
              hint="% interanual · dato mensual"
              infoKey="us-cpi"
              noData={cpiData.length < 2}
            >
              <LineChart datasets={[{ label: "CPI YoY", data: cpiData, color: COLORS.cpi }]} />
            </ChartBox>
          </>
        ) : (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl p-4 text-[13px] text-[var(--muted)]">
            Sin datos todavía. Configurá <code className="bg-[var(--chip-bg)] px-1 rounded">FRED_API_KEY</code> y corré el backfill.
          </div>
        )}
      </Section>

      <Section title="🇪🇺 Eurozona" chip={{ text: "v0.3", tone: "pending" }}>
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl p-4 text-[13px] text-[var(--muted)]">
          Llega en v0.3: ECB DFR, HICP, Bund 10Y, BTP spread (vía ECB SDW + Eurostat).
        </div>
      </Section>

      {/* CHINA */}
      <Section title="🇨🇳 China" chip={{ text: "FRED", tone: "live" }}>
        {(() => {
          const cnTiles = byIds(latest, ["cn.cpi.yoy", "cn.fx.usdcny"]);
          const cnColors: Record<string, string> = {
            "cn.cpi.yoy":   COLORS.cnCpi,
            "cn.fx.usdcny": COLORS.cnFx,
          };
          const cnFxData  = spark("cn.fx.usdcny");
          const cnCpiData = spark("cn.cpi.yoy");

          if (!cnTiles.some(r => r.value !== null)) {
            return (
              <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl p-4 text-[13px] text-[var(--muted)]">
                Sin datos todavía. Corré el backfill para <code className="bg-[var(--chip-bg)] px-1 rounded">source=fred</code>.
              </div>
            );
          }
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {cnTiles.map(r => (
                  <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={cnColors[r.id]} info={INFO[r.id]} staleAfterDays={STALE_DAYS[r.id]} />
                ))}
              </div>
              {cnFxData.length >= 2 && (
                <ChartBox title="USD/CNY" hint="CNY por dólar" infoKey="cn-fx">
                  <LineChart datasets={[{ label: "USD/CNY", data: cnFxData, color: COLORS.cnFx }]} />
                </ChartBox>
              )}
              {cnCpiData.length >= 2 && (
                <ChartBox title="CPI YoY" hint="% interanual · dato mensual" infoKey="cn-prices">
                  <LineChart datasets={[{ label: "CPI YoY", data: cnCpiData, color: COLORS.cnCpi }]} />
                </ChartBox>
              )}
            </>
          );
        })()}
      </Section>

      <footer className="mt-8 pt-4 border-t border-[var(--border)] text-center text-[11px] text-[var(--muted)] leading-relaxed">
        Radar Económico v0.3 — Next.js + MongoDB · DolarAPI · ArgentinaDatos · CoinGecko · BCRA · FRED<br />
        Cron diario 10:00 UTC · datos desde {rangeDays === "max" ? "siempre" : `últimos ${rangeDays}d`}
      </footer>
    </main>
  );
}
