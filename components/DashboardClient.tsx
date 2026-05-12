"use client";

import { useState, useEffect, useCallback } from "react";
import { Tile } from "./Tile";
import { Section } from "./Section";
import { RangeSelector, type RangeDays } from "./RangeSelector";
import { LineChart, BarChart, type DataPoint } from "./charts";
import type { LatestRow } from "@/app/api/snapshots/latest/route";
import type { HistoryResponse } from "@/app/api/snapshots/history/route";

// Color palette matching the HTML artifact
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
};

type SeriesMap = Record<string, DataPoint[]>;

function byId(rows: LatestRow[], id: string): LatestRow | undefined {
  return rows.find((r) => r.id === id);
}

function byIds(rows: LatestRow[], ids: string[]): LatestRow[] {
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = map.get(id);
    return r ? [r] : [];
  });
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
    if (oldest && oldest <= cutoff) return; // we already have enough data
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

  const spark = (id: string): DataPoint[] => filterRange(history[id] ?? [], rangeDays);

  // Computed values
  const oficialVenta = byId(latest, "ar.dolar.oficial.venta")?.value ?? null;
  const cclVenta = byId(latest, "ar.dolar.ccl.venta")?.value ?? null;
  const blueVenta = byId(latest, "ar.dolar.blue.venta")?.value ?? null;

  const lastUpdate = latest
    .map((r) => r.timestamp)
    .filter((t): t is string => !!t)
    .sort()
    .pop() ?? null;

  // --- Section: Tiles principales ---
  const tilesPrincipales = byIds(latest, [
    "ar.dolar.oficial.venta",
    "ar.dolar.ccl.venta",
    "ar.dolar.blue.venta",
    "ar.riesgo_pais",
    "crypto.btc.usd",
    "crypto.eth.usd",
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

  // --- Dolar table data ---
  const dolarTableRows = [
    { id: "ar.dolar.mayorista.venta", compraId: "ar.dolar.mayorista.venta", label: "Mayorista (A3500)" },
    { id: "ar.dolar.oficial.venta", compraId: "ar.dolar.oficial.compra", label: "Oficial (BNA)" },
    { id: "ar.dolar.tarjeta.venta", compraId: "ar.dolar.tarjeta.venta", label: "Tarjeta" },
    { id: "ar.dolar.blue.venta", compraId: "ar.dolar.blue.venta", label: "Blue" },
    { id: "ar.dolar.mep.venta", compraId: "ar.dolar.mep.venta", label: "MEP" },
    { id: "ar.dolar.ccl.venta", compraId: "ar.dolar.ccl.venta", label: "CCL" },
    { id: "ar.dolar.cripto.venta", compraId: "ar.dolar.cripto.venta", label: "Cripto (USDT)" },
  ];

  // --- Dolar chart datasets (filtered by range) ---
  const dolarChartDatasets = [
    { label: "Mayorista", data: spark("ar.dolar.mayorista.venta"), color: COLORS.mayorista },
    { label: "Oficial", data: spark("ar.dolar.oficial.venta"), color: COLORS.oficial },
    { label: "Blue", data: spark("ar.dolar.blue.venta"), color: COLORS.blue },
    { label: "MEP", data: spark("ar.dolar.mep.venta"), color: COLORS.mep },
    { label: "CCL", data: spark("ar.dolar.ccl.venta"), color: COLORS.ccl },
    { label: "Cripto", data: spark("ar.dolar.cripto.venta"), color: COLORS.cripto },
  ].filter((d) => d.data.length > 0);

  // Brecha chart: compute % over oficial per day
  const oficialSeries = filterRange(history["ar.dolar.oficial.venta"] ?? [], rangeDays);
  const oficialByDate = new Map(oficialSeries.map((p) => [p.t, p.v]));
  function brechaDataset(id: string, label: string, color: string) {
    const series = filterRange(history[id] ?? [], rangeDays);
    const data = series
      .map((p) => {
        const of = oficialByDate.get(p.t);
        if (!of) return null;
        return { t: p.t, v: +((p.v / of - 1) * 100).toFixed(2) };
      })
      .filter((p): p is DataPoint => p !== null);
    return { label, data, color };
  }

  const brechaDatasets = [
    brechaDataset("ar.dolar.blue.venta", "Blue", COLORS.blue),
    brechaDataset("ar.dolar.mep.venta", "MEP", COLORS.mep),
    brechaDataset("ar.dolar.ccl.venta", "CCL", COLORS.ccl),
    brechaDataset("ar.dolar.cripto.venta", "Cripto", COLORS.cripto),
  ].filter((d) => d.data.length > 0);

  // --- Macro AR ---
  const macroTiles = byIds(latest, ["ar.ipc.mensual", "ar.riesgo_pais"]);
  const bcraTiles = byIds(latest, ["ar.bcra.tasa_politica", "ar.bcra.reservas", "ar.bcra.base_monetaria"]);

  // --- Crypto ---
  const cryptoTiles = byIds(latest, ["crypto.btc.usd", "crypto.eth.usd"]);
  const cryptoDatasets = [
    { label: "BTC/USD", data: spark("crypto.btc.usd"), color: COLORS.btc, yAxisID: "y" },
    { label: "ETH/USD", data: spark("crypto.eth.usd"), color: COLORS.eth, yAxisID: "y1" },
  ].filter((d) => d.data.length > 0);

  // --- USA ---
  const usTiles = byIds(latest, [
    "us.fed_funds.upper",
    "us.ust.dgs10",
    "us.cpi.yoy",
    "us.unrate",
    "us.payems",
    "us.dxy_broad",
  ]);

  const usRatesDatasets = [
    { label: "Fed Funds", data: spark("us.fed_funds.upper"), color: COLORS.fedFunds },
    { label: "UST 10Y", data: spark("us.ust.dgs10"), color: COLORS.ust10 },
  ].filter((d) => d.data.length > 0);

  return (
    <main className="px-3.5 py-4 pb-10 max-w-screen-xl mx-auto">
      <header className="mb-4">
        <h1 className="text-[20px] font-semibold tracking-tight">Radar Económico</h1>
        <div className="text-[12px] text-[var(--muted)] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Argentina · USA · Eurozona · China</span>
          <span>·</span>
          <span>
            Última actualización:{" "}
            <span className="num">{lastUpdate ? fmtDate(lastUpdate) : "—"}</span>
          </span>
          {loading && <span className="text-[var(--warn)]">cargando...</span>}
        </div>
        <RangeSelector value={rangeDays} onChange={setRangeDays} />
      </header>

      {/* TILES PRINCIPALES */}
      <Section title="Tiles principales" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {tilesPrincipales.map((r) => (
            <Tile
              key={r.id}
              row={r}
              sub={tileSubs[r.id]}
              sparkline={spark(r.id)}
              sparkColor={tileColors[r.id]}
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
                  <th
                    key={h}
                    className={`px-2.5 py-2 text-[10.5px] uppercase tracking-wider font-bold text-[var(--muted)] bg-[var(--chip-bg)] border-b border-[var(--border)] ${i > 0 ? "text-right" : "text-left"}`}
                  >
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
                  ? brecha(oficialVenta, venta)
                  : "—";
                const brColor = br !== "—" && br.startsWith("+")
                  ? "text-[var(--pos)]"
                  : br !== "—"
                  ? "text-[var(--neg)]"
                  : "text-[var(--muted)]";
                return (
                  <tr key={id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-2.5 py-2">{label}</td>
                    <td className="px-2.5 py-2 text-right num">{fmtARS(venta)}</td>
                    <td className={`px-2.5 py-2 text-right num font-medium ${brColor}`}>{br}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {dolarChartDatasets.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">Evolución del dólar</span>
              <span className="text-[11px] text-[var(--muted)]">ARS por USD · venta</span>
            </div>
            <LineChart datasets={dolarChartDatasets} />
          </div>
        )}

        {brechaDatasets.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">Brecha cambiaria vs oficial</span>
              <span className="text-[11px] text-[var(--muted)]">% sobre oficial</span>
            </div>
            <LineChart datasets={brechaDatasets} />
          </div>
        )}
      </Section>

      {/* AR · MACRO */}
      <Section title="🇦🇷 Argentina · Macro" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {macroTiles.map((r) => (
            <Tile
              key={r.id}
              row={r}
              sparkline={spark(r.id)}
              sparkColor={r.id === "ar.riesgo_pais" ? COLORS.riesgo : COLORS.ipc}
            />
          ))}
        </div>

        {(history["ar.riesgo_pais"] ?? []).length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">Riesgo país</span>
              <span className="text-[11px] text-[var(--muted)]">EMBI+ AR · puntos básicos</span>
            </div>
            <LineChart
              datasets={[{ label: "Riesgo país", data: spark("ar.riesgo_pais"), color: COLORS.riesgo }]}
            />
          </div>
        )}

        {(history["ar.ipc.mensual"] ?? []).length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">Inflación mensual</span>
              <span className="text-[11px] text-[var(--muted)]">INDEC · % m/m</span>
            </div>
            <BarChart data={spark("ar.ipc.mensual")} color={COLORS.ipc} />
          </div>
        )}
      </Section>

      {/* AR · BCRA */}
      <Section title="🇦🇷 Argentina · BCRA" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {bcraTiles.map((r) => {
            const c = r.id === "ar.bcra.tasa_politica" ? COLORS.tasa
              : r.id === "ar.bcra.reservas" ? COLORS.reservas
              : COLORS.base;
            return <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={c} />;
          })}
        </div>

        {["ar.bcra.tasa_politica", "ar.bcra.reservas", "ar.bcra.base_monetaria"].some(
          (id) => (history[id] ?? []).length > 0
        ) && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">Variables BCRA</span>
              <span className="text-[11px] text-[var(--muted)]">tasa en %</span>
            </div>
            <LineChart
              datasets={[
                { label: "Tasa política", data: spark("ar.bcra.tasa_politica"), color: COLORS.tasa },
              ].filter((d) => d.data.length > 0)}
            />
          </div>
        )}
      </Section>

      {/* CRIPTO */}
      <Section title="₿ Cripto" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {cryptoTiles.map((r) => (
            <Tile
              key={r.id}
              row={r}
              sparkline={spark(r.id)}
              sparkColor={r.id === "crypto.btc.usd" ? COLORS.btc : COLORS.eth}
            />
          ))}
        </div>

        {cryptoDatasets.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">BTC y ETH</span>
              <span className="text-[11px] text-[var(--muted)]">USD · ejes separados</span>
            </div>
            <LineChart datasets={cryptoDatasets} yAxisLabel="BTC" yAxisLabelRight="ETH" />
          </div>
        )}
      </Section>

      {/* USA */}
      <Section title="🇺🇸 USA" chip={{ text: "FRED", tone: "live" }}>
        {usTiles.some((r) => r.value !== null) ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {usTiles.map((r) => {
                const colors: Record<string, string> = {
                  "us.fed_funds.upper": COLORS.fedFunds,
                  "us.ust.dgs10": COLORS.ust10,
                  "us.cpi.yoy": COLORS.cpi,
                  "us.unrate": COLORS.unrate,
                  "us.payems": COLORS.nfp,
                  "us.dxy_broad": COLORS.dxy,
                };
                return <Tile key={r.id} row={r} sparkline={spark(r.id)} sparkColor={colors[r.id]} />;
              })}
            </div>

            {usRatesDatasets.length > 0 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">Fed Funds y UST 10Y</span>
                  <span className="text-[11px] text-[var(--muted)]">% anual</span>
                </div>
                <LineChart datasets={usRatesDatasets} />
              </div>
            )}

            {(history["us.cpi.yoy"] ?? []).length > 0 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">CPI YoY</span>
                  <span className="text-[11px] text-[var(--muted)]">% interanual</span>
                </div>
                <LineChart
                  datasets={[{ label: "CPI YoY", data: spark("us.cpi.yoy"), color: COLORS.cpi }]}
                />
              </div>
            )}
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

      <Section title="🇨🇳 China" chip={{ text: "v0.3", tone: "pending" }}>
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl p-4 text-[13px] text-[var(--muted)]">
          Llega en v0.3: LPR, CPI, PPI, USD/CNY, Caixin PMI (vía FRED + Stooq).
        </div>
      </Section>

      <footer className="mt-8 pt-4 border-t border-[var(--border)] text-center text-[11px] text-[var(--muted)] leading-relaxed">
        Radar Económico v0.2 — Next.js + MongoDB · DolarAPI · ArgentinaDatos · CoinGecko · BCRA · FRED<br />
        Cron diario 10:00 UTC · datos desde {rangeDays === "max" ? "siempre" : `últimos ${rangeDays}d`}
      </footer>
    </main>
  );
}
