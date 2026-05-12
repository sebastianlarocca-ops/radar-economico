"use client";

import { useState, useEffect, useCallback } from "react";
import { Tile } from "./Tile";
import { Section } from "./Section";
import { RangeSelector, type RangeDays } from "./RangeSelector";
import { LineChart, BarChart, type DataPoint } from "./charts";
import { InfoTooltip } from "./InfoTooltip";
import type { LatestRow } from "@/app/api/snapshots/latest/route";
import type { HistoryResponse } from "@/app/api/snapshots/history/route";

// ── Colors ──────────────────────────────────────────────────────────────
const C = {
  blue:    "#5B9DFF",
  green:   "#34D399",
  red:     "#F87171",
  orange:  "#FB923C",
  violet:  "#A78BFA",
  amber:   "#FBBF24",
};

const TILE_COLOR: Record<string, string> = {
  "ar.dolar.oficial.venta":    C.blue,
  "ar.dolar.oficial.compra":   C.blue,
  "ar.dolar.mayorista.venta":  C.blue,
  "ar.dolar.blue.venta":       C.green,
  "ar.dolar.mep.venta":        C.orange,
  "ar.dolar.ccl.venta":        C.red,
  "ar.dolar.cripto.venta":     C.violet,
  "ar.dolar.tarjeta.venta":    "#94A3B8",
  "ar.riesgo_pais":            C.red,
  "ar.ipc.mensual":            C.red,
  "ar.bcra.tasa_politica":     C.blue,
  "ar.bcra.reservas":          C.green,
  "ar.bcra.base_monetaria":    C.violet,
  "crypto.btc.usd":            C.orange,
  "crypto.eth.usd":            C.violet,
  "us.fed_funds.upper":        C.blue,
  "us.ust.dgs10":              C.violet,
  "us.cpi.yoy":                C.red,
  "us.unrate":                 C.orange,
  "us.payems":                 C.green,
  "us.dxy_broad":              C.blue,
  "cn.cpi.yoy":                C.red,
  "cn.fx.usdcny":              C.blue,
  "eu.ecb.dfr":                C.blue,
  "eu.hicp.yoy":               C.red,
  "eu.fx.eurusd":              C.green,
  "eu.rates.bund10y":          C.violet,
};

const STALE_DAYS: Record<string, number> = {
  "ar.dolar.oficial.venta":    2,  "ar.dolar.oficial.compra":   2,
  "ar.dolar.mayorista.venta":  2,  "ar.dolar.blue.venta":       2,
  "ar.dolar.mep.venta":        2,  "ar.dolar.ccl.venta":        2,
  "ar.dolar.cripto.venta":     2,  "ar.dolar.tarjeta.venta":    2,
  "ar.riesgo_pais":            2,  "ar.ipc.mensual":           45,
  "ar.bcra.tasa_politica":     7,  "ar.bcra.reservas":          7,
  "ar.bcra.base_monetaria":    7,
  "crypto.btc.usd":            2,  "crypto.eth.usd":            2,
  "us.fed_funds.upper":        7,  "us.ust.dgs10":              2,
  "us.cpi.yoy":               45,  "us.unrate":                45,  "us.payems": 45,
  "us.dxy_broad":              2,
  "cn.cpi.yoy":               45,  "cn.fx.usdcny":              2,
  "eu.ecb.dfr":                7,  "eu.hicp.yoy":              45,
  "eu.fx.eurusd":              2,  "eu.rates.bund10y":          2,
};

const INFO: Record<string, string> = {
  "ar.dolar.oficial.venta":    "Tipo de cambio oficial publicado por el BNA. Es el precio al que el banco vende dólares al público.",
  "ar.dolar.oficial.compra":   "Precio al que el BNA compra dólares al público.",
  "ar.dolar.mayorista.venta":  "Dólar de referencia para operaciones comerciales de gran volumen entre empresas y bancos.",
  "ar.dolar.blue.venta":       "Precio en el mercado informal (paralelo). Refleja la demanda de dólares fuera del sistema bancario.",
  "ar.dolar.mep.venta":        "Dólar 'Bolsa': se obtiene comprando un bono en pesos y vendiéndolo en dólares dentro del país. Legal.",
  "ar.dolar.ccl.venta":        "Contado con liquidación: similar al MEP pero el bono se vende en el exterior. Referencia de convertibilidad real.",
  "ar.dolar.cripto.venta":     "Precio del USDT en pesos. Funciona como referencia del dólar en el mercado cripto.",
  "ar.dolar.tarjeta.venta":    "Dólar oficial más impuestos. El que pagás con tarjeta en el exterior.",
  "ar.riesgo_pais":            "EMBI+: mide cuánto más rinde un bono argentino vs un bono del Tesoro de EE.UU. Más puntos = más riesgo percibido.",
  "ar.ipc.mensual":            "Variación del IPC en un mes. Dato oficial del INDEC. Mide la inflación mensual.",
  "ar.bcra.tasa_politica":     "Tasa overnight de pases O/N. Refleja el piso del corredor de tasas del BCRA desde la transición al esquema LEFI.",
  "ar.bcra.reservas":          "Activos del BCRA en moneda extranjera. Clave para la estabilidad cambiaria. En millones de USD.",
  "ar.bcra.base_monetaria":    "Total de pesos emitidos por el BCRA. Incluye billetes en circulación y depósitos bancarios en el BCRA.",
  "crypto.btc.usd":            "Precio de mercado de Bitcoin en dólares.",
  "crypto.eth.usd":            "Precio de mercado de Ethereum en dólares.",
  "us.fed_funds.upper":        "Tasa objetivo de la Reserva Federal. Afecta el costo del crédito en todo el mundo.",
  "us.ust.dgs10":              "Rendimiento del bono del Tesoro de EE.UU. a 10 años. Referencia global del activo libre de riesgo.",
  "us.cpi.yoy":                "Inflación interanual de EE.UU. Dato clave para las decisiones de la Fed.",
  "us.unrate":                 "Porcentaje de la fuerza laboral sin empleo en EE.UU.",
  "us.payems":                 "Nonfarm Payrolls: empleos creados fuera del sector agrícola.",
  "us.dxy_broad":              "Índice del dólar frente a una canasta amplia de monedas.",
  "cn.cpi.yoy":                "Inflación interanual de China. El PBOC la monitorea para calibrar política monetaria.",
  "cn.fx.usdcny":              "Yuan chino por dólar. Un CNY más débil abarata exportaciones chinas.",
  "eu.ecb.dfr":                "Tasa de facilidad de depósito del BCE. Ancla la política monetaria de la eurozona.",
  "eu.hicp.yoy":               "Inflación interanual de la eurozona (HICP). Objetivo del BCE: 2%.",
  "eu.fx.eurusd":              "Tipo de cambio euro/dólar. Tasa de referencia diaria del BCE.",
  "eu.rates.bund10y":          "Rendimiento implícito a 10 años de la curva AAA de la eurozona (proxy del Bund alemán).",
  "derived.btc.ars":           "Bitcoin expresado en pesos argentinos. BTC en USD × USDT/ARS.",
  "derived.brecha.cripto_blue":"Diferencia porcentual entre el dólar cripto (USDT) y el dólar blue.",
  "derived.brecha.cripto_ccl": "Diferencia porcentual entre el dólar cripto (USDT) y el CCL.",
};

const CHART_INFO: Record<string, string> = {
  "dolar-evolucion": "Cómo evolucionó el precio de venta de cada tipo de dólar en el período seleccionado.",
  "brecha":          "Diferencia porcentual de cada cotización vs el dólar oficial.",
  "riesgo":          "Evolución del EMBI+ Argentina. Cae cuando el mercado percibe menos riesgo.",
  "ipc-chart":       "Inflación mensual registrada por el INDEC. Dato mensual.",
  "bcra-variables":  "Evolución de la tasa overnight de pases O/N.",
  "crypto-chart":    "BTC y ETH normalizados (base 100 al inicio del período).",
  "fed-rates":       "Evolución de la tasa Fed Funds y el rendimiento del bono a 10 años.",
  "us-cpi":          "Inflación interanual de EE.UU. Dato mensual.",
  "cn-fx":           "Evolución del tipo de cambio USD/CNY.",
  "cn-prices":       "CPI de China en variación interanual.",
  "eu-rates":        "Evolución de la tasa DFR del BCE y el Bund 10Y.",
  "eu-hicp":         "Inflación interanual de la eurozona (HICP). Dato mensual.",
  "eu-eurusd":       "Evolución del tipo de cambio EUR/USD.",
};

type SeriesMap = Record<string, DataPoint[]>;

function byId(rows: LatestRow[], id: string) {
  return rows.find((r) => r.id === id);
}
function byIds(rows: LatestRow[], ids: string[]) {
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => { const r = map.get(id); return r ? [r] : []; });
}
function filterRange(points: DataPoint[], days: RangeDays): DataPoint[] {
  if (!points?.length) return [];
  if (days === "max") return points;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return points.filter((p) => p.t >= cutoff);
}
function pctDiff(a: number | null, b: number | null): string {
  if (!a || !b) return "—";
  const v = (a / b - 1) * 100;
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}
function fmtARS(v: number | null, d = 0): string {
  if (v == null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
}
function fmtDate(ts: string | null): string {
  if (!ts) return "—";
  const dt = new Date(ts);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function brechaVal(a: number | null, b: number | null): number | null {
  if (!a || !b) return null;
  return +((a / b - 1) * 100).toFixed(1);
}

// ── ChartCard ────────────────────────────────────────────────────────────
function ChartCard({
  eyebrow,
  hint,
  infoKey,
  children,
  noData,
}: {
  eyebrow: string;
  hint?: string;
  infoKey?: string;
  children: React.ReactNode;
  noData?: boolean;
}) {
  return (
    <div className="mp-card" style={{ padding: "20px 22px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="mp-eyebrow">{eyebrow}</span>
          {infoKey && CHART_INFO[infoKey] && <InfoTooltip text={CHART_INFO[infoKey]} />}
        </div>
        {hint && <span className="kpi-sub">{hint}</span>}
      </div>
      {noData ? (
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t-3)", fontSize: 12 }}>
          Acumulando historial · los datos aparecerán con el correr de los días
        </div>
      ) : children}
    </div>
  );
}

// ── Ticker ────────────────────────────────────────────────────────────────
function Ticker({ latest, history }: { latest: LatestRow[]; history: SeriesMap }) {
  function delta(id: string): number | null {
    const pts = history[id];
    if (!pts || pts.length < 2) return null;
    const a = pts[pts.length - 2].v;
    const b = pts[pts.length - 1].v;
    if (!a) return null;
    return (b / a - 1) * 100;
  }

  const get = (id: string) => byId(latest, id)?.value ?? null;
  const fmtV = (v: number | null, unit: string) => {
    if (v == null) return "—";
    if (unit === "ARS") return fmtARS(v);
    if (unit === "USD") return "US$ " + Math.round(v).toLocaleString("en-US");
    if (unit === "PCT") return v.toFixed(2) + "%";
    if (unit === "BP") return Math.round(v).toLocaleString("en-US") + " bp";
    return v.toFixed(3);
  };

  const items = [
    { lbl: "OFICIAL",  val: fmtV(get("ar.dolar.oficial.venta"), "ARS"),  delta: delta("ar.dolar.oficial.venta") },
    { lbl: "BLUE",     val: fmtV(get("ar.dolar.blue.venta"), "ARS"),     delta: delta("ar.dolar.blue.venta") },
    { lbl: "CCL",      val: fmtV(get("ar.dolar.ccl.venta"), "ARS"),      delta: delta("ar.dolar.ccl.venta") },
    { lbl: "MEP",      val: fmtV(get("ar.dolar.mep.venta"), "ARS"),      delta: delta("ar.dolar.mep.venta") },
    { lbl: "EMBI+ AR", val: fmtV(get("ar.riesgo_pais"), "BP"),           delta: delta("ar.riesgo_pais") },
    { lbl: "BTC/USD",  val: fmtV(get("crypto.btc.usd"), "USD"),          delta: delta("crypto.btc.usd") },
    { lbl: "ETH/USD",  val: fmtV(get("crypto.eth.usd"), "USD"),          delta: delta("crypto.eth.usd") },
    { lbl: "UST 10Y",  val: fmtV(get("us.ust.dgs10"), "PCT"),            delta: delta("us.ust.dgs10") },
    { lbl: "FED FUNDS",val: fmtV(get("us.fed_funds.upper"), "PCT"),       delta: null },
    { lbl: "DXY",      val: get("us.dxy_broad")?.toFixed(2) ?? "—",      delta: delta("us.dxy_broad") },
    { lbl: "USD/CNY",  val: get("cn.fx.usdcny")?.toFixed(3) ?? "—",     delta: delta("cn.fx.usdcny") },
    { lbl: "BUND 10Y", val: fmtV(get("eu.rates.bund10y"), "PCT"),        delta: delta("eu.rates.bund10y") },
  ];
  const all = [...items, ...items];

  return (
    <div className="ticker">
      <div className="ticker-track">
        {all.map((it, i) => (
          <span key={i} className="ticker-item">
            <span className="lbl">{it.lbl}</span>
            <span className="val">{it.val}</span>
            {it.delta != null && (
              <span style={{ color: it.delta >= 0 ? "var(--green)" : "var(--red)", fontSize: 10.5 }}>
                {it.delta >= 0 ? "▲" : "▼"} {Math.abs(it.delta).toFixed(2)}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────
const REGIONS = [
  { id: "ar", name: "Argentina", flag: "🇦🇷" },
  { id: "us", name: "USA",       flag: "🇺🇸" },
  { id: "eu", name: "Eurozona",  flag: "🇪🇺" },
  { id: "cn", name: "China",     flag: "🇨🇳" },
  { id: "cx", name: "Crypto",    flag: "◇" },
];

function Header({
  range,
  setRange,
  active,
  toggle,
  lastUpdate,
  latest,
  history,
}: {
  range: RangeDays;
  setRange: (v: RangeDays) => void;
  active: Set<string>;
  toggle: (id: string) => void;
  lastUpdate: string | null;
  latest: LatestRow[];
  history: SeriesMap;
}) {
  return (
    <header className="mp-header">
      {/* Top bar */}
      <div className="mp-container" style={{ display: "flex", alignItems: "center", gap: 20, height: 64 }}>
        <div className="brand">
          <span className="brand-mark">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 8 L3 5 L5 7 L7 3 L9 6 L11 4" stroke="#5B9DFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="11" cy="4" r="1.4" fill="#5B9DFF" />
            </svg>
          </span>
          <span>
            Macro Pulse{" "}
            <span style={{ fontSize: 10, color: "var(--t-4)", letterSpacing: "0.06em", fontWeight: 400 }}>v0.3</span>
          </span>
        </div>

        <nav style={{ display: "flex", gap: 4, marginLeft: 4 }}>
          {["Dashboard", "Indicators", "Calendar", "Alerts"].map((n, i) => (
            <button
              key={n}
              className="mp-chip"
              style={i === 0 ? { color: "var(--t-1)", background: "rgba(255,255,255,0.04)", borderColor: "var(--line-2)" } : { background: "transparent", border: "1px solid transparent", color: "var(--t-3)" }}
            >
              {n}
            </button>
          ))}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div className="mp-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: "var(--t-3)", flexShrink: 0 }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>Buscar indicadores…</span>
            <span className="kbd">⌘K</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--t-3)" }}>
            <span className="live-dot" />
            <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
              Live · {lastUpdate ? fmtDate(lastUpdate) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-bar: title + region chips + range */}
      <div className="mp-container" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 16, paddingBottom: 18, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div className="mp-eyebrow" style={{ marginBottom: 8 }}>Macroeconomic Intelligence</div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--t-1)" }}>
            Global radar
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                className={"mp-chip" + (active.has(r.id) ? " is-active" : "")}
                onClick={() => toggle(r.id)}
              >
                <span style={{ fontSize: 13 }}>{r.flag}</span>
                {r.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      <Ticker latest={latest} history={history} />
    </header>
  );
}

// ── Main DashboardClient ──────────────────────────────────────────────────
export function DashboardClient({
  latest,
  initialHistory,
}: {
  latest: LatestRow[];
  initialHistory: SeriesMap;
}) {
  const [range, setRange] = useState<RangeDays>(90);
  const [history, setHistory] = useState<SeriesMap>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(new Set(["ar", "us", "eu", "cn", "cx"]));

  function toggle(id: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.size === 1 && next.has(id)) {
        return new Set(["ar", "us", "eu", "cn", "cx"]);
      }
      if (next.has(id)) next.delete(id); else next.add(id);
      return next.size === 0 ? new Set([id]) : next;
    });
  }

  const fetchHistory = useCallback(async (days: RangeDays) => {
    const needed = days === "max" ? 3650 : days;
    const oldest = Object.values(history).flat().map((p) => p.t).sort()[0];
    const cutoff = new Date(Date.now() - needed * 86400000).toISOString().slice(0, 10);
    if (oldest && oldest <= cutoff) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/snapshots/history?days=${days === "max" ? 3650 : days}`);
      if (res.ok) setHistory(((await res.json()) as HistoryResponse).series);
    } finally { setLoading(false); }
  }, [history]);

  useEffect(() => { fetchHistory(range); }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const spark = (id: string): DataPoint[] => {
    const all = history[id] ?? [];
    const filtered = filterRange(all, range);
    return filtered.length >= 2 ? filtered : all.slice(-180);
  };

  // Latest values
  const oficialVenta = byId(latest, "ar.dolar.oficial.venta")?.value ?? null;
  const cclVenta     = byId(latest, "ar.dolar.ccl.venta")?.value ?? null;
  const blueVenta    = byId(latest, "ar.dolar.blue.venta")?.value ?? null;
  const criptoRow    = byId(latest, "ar.dolar.cripto.venta");
  const criptoVenta  = criptoRow?.value ?? null;
  const btcRow       = byId(latest, "crypto.btc.usd");
  const lastUpdate   = latest.map((r) => r.timestamp).filter((t): t is string => !!t).sort().pop() ?? null;

  // Derived rows
  const btcArsRow: LatestRow = {
    id: "derived.btc.ars", label: "Bitcoin (ARS)",
    region: "GLOBAL", category: "crypto", unit: "ARS", decimals: 0,
    value: btcRow?.value && criptoVenta ? Math.round(btcRow.value * criptoVenta) : null,
    timestamp: btcRow?.timestamp ?? null, source: "derivado", meta: null,
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

  // Chart datasets
  const dolarDatasets = [
    { label: "Oficial",  data: spark("ar.dolar.oficial.venta"),   color: C.blue },
    { label: "Blue",     data: spark("ar.dolar.blue.venta"),      color: C.green },
    { label: "MEP",      data: spark("ar.dolar.mep.venta"),       color: C.orange },
    { label: "CCL",      data: spark("ar.dolar.ccl.venta"),       color: C.red },
    { label: "Cripto",   data: spark("ar.dolar.cripto.venta"),    color: C.violet },
  ].filter((d) => d.data.length >= 2);

  const oficialByDate = new Map(spark("ar.dolar.oficial.venta").map((p) => [p.t, p.v]));
  const brechaDatasets = [
    { label: "Blue",   data: spark("ar.dolar.blue.venta"),   color: C.green },
    { label: "MEP",    data: spark("ar.dolar.mep.venta"),    color: C.orange },
    { label: "CCL",    data: spark("ar.dolar.ccl.venta"),    color: C.red },
    { label: "Cripto", data: spark("ar.dolar.cripto.venta"), color: C.violet },
  ].map(({ label, data, color }) => ({
    label, color,
    data: data.flatMap((p) => {
      const of = oficialByDate.get(p.t);
      return of ? [{ t: p.t, v: +((p.v / of - 1) * 100).toFixed(2) }] : [];
    }),
  })).filter((d) => d.data.length >= 2);

  const btcArsSparkline = (() => {
    const criptoMap = new Map(spark("ar.dolar.cripto.venta").map((p) => [p.t, p.v]));
    return spark("crypto.btc.usd").flatMap((p) => {
      const u = criptoMap.get(p.t);
      return u ? [{ t: p.t, v: Math.round(p.v * u) }] : [];
    });
  })();

  const usRatesDatasets = [
    { label: "Fed Funds", data: spark("us.fed_funds.upper"), color: C.blue },
    { label: "UST 10Y",   data: spark("us.ust.dgs10"),       color: C.violet },
  ].filter((d) => d.data.length >= 2);

  const euRatesDatasets = [
    { label: "ECB DFR",  data: spark("eu.ecb.dfr"),         color: C.blue },
    { label: "Bund 10Y", data: spark("eu.rates.bund10y"),   color: C.violet },
  ].filter((d) => d.data.length >= 2);

  function norm(pts: DataPoint[]): DataPoint[] {
    if (!pts.length) return pts;
    const base = pts[0].v || 1;
    return pts.map((p) => ({ t: p.t, v: (p.v / base) * 100 }));
  }

  const noEuData = !byIds(latest, ["eu.ecb.dfr","eu.hicp.yoy","eu.fx.eurusd","eu.rates.bund10y"]).some((r) => r.value != null);
  const noCnData = !byIds(latest, ["cn.cpi.yoy","cn.fx.usdcny"]).some((r) => r.value != null);
  const noUsData = !byIds(latest, ["us.fed_funds.upper","us.ust.dgs10","us.cpi.yoy","us.unrate","us.payems","us.dxy_broad"]).some((r) => r.value != null);

  return (
    <div>
      <Header
        range={range}
        setRange={setRange}
        active={active}
        toggle={toggle}
        lastUpdate={lastUpdate}
        latest={latest}
        history={history}
      />

      <main className="mp-container" style={{ padding: "32px 28px 96px", position: "relative", zIndex: 1 }}>
        {loading && (
          <div style={{ position: "fixed", top: 70, right: 24, zIndex: 60, display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--t-3)" }}>
            <span className="live-dot" style={{ background: "var(--amber)", animationDuration: "1s" }} />
            Cargando historial…
          </div>
        )}

        {/* ── Principal tiles ── */}
        <Section eyebrow="Tiles Principales · Global" live right={<span className="kpi-sub">{lastUpdate ? fmtDate(lastUpdate) : "—"}</span>}>
          <div className="row-grid grid-6 mp-reveal">
            {byIds(latest, ["ar.dolar.oficial.venta","ar.dolar.ccl.venta","ar.dolar.blue.venta","ar.riesgo_pais","crypto.btc.usd","crypto.eth.usd"]).map((r) => (
              <Tile
                key={r.id} row={r}
                sub={r.id === "ar.dolar.ccl.venta" ? `brecha ${pctDiff(cclVenta, oficialVenta)}`
                   : r.id === "ar.dolar.blue.venta" ? `brecha ${pctDiff(blueVenta, oficialVenta)}`
                   : undefined}
                sparkline={spark(r.id)}
                sparkColor={TILE_COLOR[r.id]}
                glowColor={TILE_COLOR[r.id] + "2e"}
                info={INFO[r.id]}
                staleAfterDays={STALE_DAYS[r.id]}
              />
            ))}
          </div>
        </Section>

        {/* ── Argentina ── */}
        {active.has("ar") && (
          <>
            {/* Dólar y brecha */}
            <Section region="Argentina" flag="🇦🇷" eyebrow="Dólar y Brecha" live>
              <div className="mp-card" style={{ overflow: "hidden" }}>
                <table className="mp-table">
                  <thead>
                    <tr>
                      <th>Cotización</th>
                      <th className="num">Venta · ARS</th>
                      <th className="num">Brecha vs Oficial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: "ar.dolar.mayorista.venta", label: "Mayorista (A3500)" },
                      { id: "ar.dolar.oficial.venta",   label: "Oficial (BNA)" },
                      { id: "ar.dolar.tarjeta.venta",   label: "Tarjeta" },
                      { id: "ar.dolar.blue.venta",      label: "Blue" },
                      { id: "ar.dolar.mep.venta",       label: "MEP" },
                      { id: "ar.dolar.ccl.venta",       label: "CCL" },
                      { id: "ar.dolar.cripto.venta",    label: "Cripto (USDT)" },
                    ].map(({ id, label }) => {
                      const row = byId(latest, id);
                      const v = row?.value ?? null;
                      const showBrecha = id !== "ar.dolar.oficial.venta" && id !== "ar.dolar.mayorista.venta";
                      const br = showBrecha ? pctDiff(v, oficialVenta) : "—";
                      const brClass = br === "—" ? "delta-neu" : br.startsWith("+") ? "delta-up" : "delta-down";
                      return (
                        <tr key={id}>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              {label}
                              {INFO[id] && <InfoTooltip text={INFO[id]} />}
                            </span>
                          </td>
                          <td className="num">{fmtARS(v)}</td>
                          <td className={`num ${brClass}`}>{br}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Evolución + Brecha charts */}
            <section className="mp-section" style={{ paddingTop: 0 }}>
              <div className="row-grid" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 16 }}>
                {dolarDatasets.length >= 1 && (
                  <ChartCard eyebrow="Evolución del Dólar" hint="ARS por USD · venta" infoKey="dolar-evolucion">
                    <LineChart datasets={dolarDatasets} height={300} showLegend formatY={(v) => Math.round(v).toLocaleString("es-AR")} />
                  </ChartCard>
                )}
                {brechaDatasets.length >= 1 && (
                  <ChartCard eyebrow="Brecha Cambiaria vs Oficial" hint="% sobre oficial" infoKey="brecha">
                    <LineChart datasets={brechaDatasets} height={280} showLegend formatY={(v) => v.toFixed(1)} unit="%" />
                  </ChartCard>
                )}
              </div>
            </section>

            {/* Macro AR */}
            <Section region="Argentina" flag="🇦🇷" eyebrow="Macro · BCRA" live>
              <div className="row-grid grid-4">
                {byIds(latest, ["ar.ipc.mensual","ar.riesgo_pais","ar.bcra.tasa_politica","ar.bcra.reservas","ar.bcra.base_monetaria"]).map((r) => (
                  <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={TILE_COLOR[r.id]} glowColor={TILE_COLOR[r.id] + "1e"} info={INFO[r.id]} staleAfterDays={STALE_DAYS[r.id]} />
                ))}
              </div>
            </Section>

            {/* Riesgo País chart + Brecha cripto tiles */}
            <section className="mp-section" style={{ paddingTop: 0 }}>
              <div className="row-grid" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 16 }}>
                <ChartCard eyebrow="Riesgo País" hint="EMBI+ AR · puntos básicos" infoKey="riesgo">
                  <LineChart
                    datasets={[{ label: "EMBI+ AR", data: spark("ar.riesgo_pais"), color: C.red }]}
                    height={260}
                    formatY={(v) => Math.round(v).toString()}
                  />
                </ChartCard>

                <div>
                  <div className="mp-eyebrow" style={{ marginBottom: 12 }}>Brecha Cripto (USDT)</div>
                  <div className="row-grid grid-2">
                    {[brechaBlueRow, brechaCclRow].map((r) => (
                      <Tile key={r.id} row={r} sparkline={undefined} sparkColor={C.violet} glowColor={C.violet + "18"} info={INFO[r.id]} />
                    ))}
                  </div>
                  {spark("ar.bcra.tasa_politica").length >= 2 && (
                    <div style={{ marginTop: 12 }}>
                      <ChartCard eyebrow="Tasa Pases O/N" hint="% · BCRA" infoKey="bcra-variables">
                        <LineChart datasets={[{ label: "Tasa O/N", data: spark("ar.bcra.tasa_politica"), color: C.blue }]} height={180} formatY={(v) => v.toFixed(1)} unit="%" />
                      </ChartCard>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* IPC chart */}
            {spark("ar.ipc.mensual").length >= 2 && (
              <section className="mp-section" style={{ paddingTop: 0 }}>
                <ChartCard eyebrow="Inflación Mensual" hint="INDEC · % m/m" infoKey="ipc-chart">
                  <BarChart data={spark("ar.ipc.mensual")} color={C.red} height={200} />
                </ChartCard>
              </section>
            )}
          </>
        )}

        {/* ── USA ── */}
        {active.has("us") && (
          <Section region="USA" flag="🇺🇸" eyebrow="Fed · Real Economy · FX" live>
            {noUsData ? (
              <div className="mp-card" style={{ padding: "20px", color: "var(--t-3)", fontSize: 13 }}>
                Sin datos todavía. Configurá <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>FRED_API_KEY</code> y corré el backfill.
              </div>
            ) : (
              <>
                <div className="row-grid grid-6" style={{ marginBottom: 12 }}>
                  {byIds(latest, ["us.fed_funds.upper","us.ust.dgs10","us.cpi.yoy","us.unrate","us.payems","us.dxy_broad"]).map((r) => (
                    <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={TILE_COLOR[r.id]} glowColor={TILE_COLOR[r.id] + "1a"} info={INFO[r.id]} staleAfterDays={STALE_DAYS[r.id]} />
                  ))}
                </div>
                {usRatesDatasets.length >= 1 && (
                  <ChartCard eyebrow="Fed Funds vs UST 10Y" hint="% anual" infoKey="fed-rates">
                    <LineChart datasets={usRatesDatasets} height={240} showLegend formatY={(v) => v.toFixed(2)} unit="%" />
                  </ChartCard>
                )}
                {spark("us.cpi.yoy").length >= 2 && (
                  <div style={{ marginTop: 12 }}>
                    <ChartCard eyebrow="CPI YoY" hint="% interanual · dato mensual" infoKey="us-cpi">
                      <LineChart datasets={[{ label: "CPI YoY", data: spark("us.cpi.yoy"), color: C.red }]} height={200} formatY={(v) => v.toFixed(2)} unit="%" />
                    </ChartCard>
                  </div>
                )}
              </>
            )}
          </Section>
        )}

        {/* ── Eurozona ── */}
        {active.has("eu") && (
          <Section
            region="Eurozona" flag="🇪🇺" eyebrow="ECB · Bunds · Inflación"
            right={
              <span className="pill" style={{ color: "var(--amber)", borderColor: "rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.06)" }}>
                v0.3 · Beta
              </span>
            }
          >
            {noEuData ? (
              <div className="mp-card" style={{ padding: "20px", color: "var(--t-3)", fontSize: 13 }}>
                Sin datos todavía. Corré el backfill: <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>source=ecb</code>
              </div>
            ) : (
              <>
                <div className="row-grid grid-4" style={{ marginBottom: 12 }}>
                  {byIds(latest, ["eu.ecb.dfr","eu.rates.bund10y","eu.hicp.yoy","eu.fx.eurusd"]).map((r) => (
                    <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={TILE_COLOR[r.id]} glowColor={TILE_COLOR[r.id] + "1a"} info={INFO[r.id]} staleAfterDays={STALE_DAYS[r.id]} />
                  ))}
                </div>
                {euRatesDatasets.length >= 1 && (
                  <ChartCard eyebrow="DFR y Bund 10Y" hint="% anual" infoKey="eu-rates">
                    <LineChart datasets={euRatesDatasets} height={240} showLegend formatY={(v) => v.toFixed(2)} unit="%" />
                  </ChartCard>
                )}
                {spark("eu.hicp.yoy").length >= 2 && (
                  <div style={{ marginTop: 12 }}>
                    <ChartCard eyebrow="HICP YoY" hint="% interanual · dato mensual" infoKey="eu-hicp">
                      <LineChart datasets={[{ label: "HICP YoY", data: spark("eu.hicp.yoy"), color: C.red }]} height={200} formatY={(v) => v.toFixed(2)} unit="%" />
                    </ChartCard>
                  </div>
                )}
                {spark("eu.fx.eurusd").length >= 2 && (
                  <div style={{ marginTop: 12 }}>
                    <ChartCard eyebrow="EUR/USD" hint="USD por euro · referencia BCE" infoKey="eu-eurusd">
                      <LineChart datasets={[{ label: "EUR/USD", data: spark("eu.fx.eurusd"), color: C.green }]} height={200} formatY={(v) => v.toFixed(4)} />
                    </ChartCard>
                  </div>
                )}
              </>
            )}
          </Section>
        )}

        {/* ── China ── */}
        {active.has("cn") && (
          <Section region="China" flag="🇨🇳" eyebrow="Inflación · FX">
            {noCnData ? (
              <div className="mp-card" style={{ padding: "20px", color: "var(--t-3)", fontSize: 13 }}>
                Sin datos todavía. Corré el backfill para <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>source=fred</code>.
              </div>
            ) : (
              <>
                <div className="row-grid grid-4" style={{ marginBottom: 12 }}>
                  {byIds(latest, ["cn.cpi.yoy","cn.fx.usdcny"]).map((r) => (
                    <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={TILE_COLOR[r.id]} glowColor={TILE_COLOR[r.id] + "1a"} info={INFO[r.id]} staleAfterDays={STALE_DAYS[r.id]} />
                  ))}
                  <div className="mp-card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 138, gridColumn: "span 2" }}>
                    <div className="kpi-label">PPI · PMI Caixin</div>
                    <div style={{ marginTop: 10, fontSize: 13, color: "var(--t-2)", lineHeight: 1.5 }}>
                      Series no disponibles en FRED. Migración a fuente alternativa
                      <span style={{ color: "var(--t-3)" }}> (NBS / Stooq)</span> en backlog v0.4.
                    </div>
                    <div className="kpi-sub" style={{ marginTop: 8, color: "var(--amber)" }}>⚠ Pendiente</div>
                  </div>
                </div>
                {spark("cn.fx.usdcny").length >= 2 && (
                  <ChartCard eyebrow="USD/CNY" hint="CNY por dólar" infoKey="cn-fx">
                    <LineChart datasets={[{ label: "USD/CNY", data: spark("cn.fx.usdcny"), color: C.blue }]} height={200} formatY={(v) => v.toFixed(3)} />
                  </ChartCard>
                )}
              </>
            )}
          </Section>
        )}

        {/* ── Crypto ── */}
        {active.has("cx") && (
          <Section region="Crypto" eyebrow="BTC · ETH · Stables" live>
            <div className="row-grid grid-4" style={{ marginBottom: 12 }}>
              {byIds(latest, ["crypto.btc.usd","crypto.eth.usd"]).map((r) => (
                <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={TILE_COLOR[r.id]} glowColor={TILE_COLOR[r.id] + "2e"} info={INFO[r.id]} staleAfterDays={STALE_DAYS[r.id]} />
              ))}
              {btcArsRow.value != null && (
                <Tile row={btcArsRow} sparkline={btcArsSparkline} sparkColor={C.orange} glowColor={C.orange + "20"} info={INFO["derived.btc.ars"]} />
              )}
            </div>
            {(spark("crypto.btc.usd").length >= 2 || spark("crypto.eth.usd").length >= 2) && (
              <ChartCard eyebrow="BTC vs ETH" hint="USD · normalizado base 100" infoKey="crypto-chart">
                <LineChart
                  datasets={[
                    { label: "BTC", data: norm(spark("crypto.btc.usd")), color: C.orange },
                    { label: "ETH", data: norm(spark("crypto.eth.usd")), color: C.violet },
                  ].filter((d) => d.data.length >= 2)}
                  height={260}
                  showLegend
                  formatY={(v) => v.toFixed(1)}
                />
              </ChartCard>
            )}
          </Section>
        )}

        {/* Footer */}
        <footer style={{ marginTop: 64, paddingTop: 20, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="kpi-sub">
            Macro Pulse · DolarAPI · ArgentinaDatos · BCRA · CoinGecko · FRED · ECB SDW
          </div>
          <div className="kpi-sub">
            © 2026 · cron 10:00 UTC · last sync {lastUpdate ? fmtDate(lastUpdate) : "—"}
          </div>
        </footer>
      </main>
    </div>
  );
}
