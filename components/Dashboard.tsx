import { Tile } from "./Tile";
import { Section } from "./Section";
import type { LatestRow } from "@/app/api/snapshots/latest/route";

function byIds(rows: LatestRow[], ids: string[]): LatestRow[] {
  const map = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => map.get(id)).filter((r): r is LatestRow => !!r);
}

function brecha(rows: LatestRow[]): string {
  const oficial = rows.find(r => r.id === "ar.dolar.oficial.venta")?.value;
  const ccl = rows.find(r => r.id === "ar.dolar.ccl.venta")?.value;
  if (!oficial || !ccl) return "—";
  const v = (ccl / oficial - 1) * 100;
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

export function Dashboard({ rows }: { rows: LatestRow[] }) {
  const tilesPrincipales = byIds(rows, [
    "ar.dolar.oficial.venta",
    "ar.dolar.ccl.venta",
    "ar.dolar.blue.venta",
    "crypto.btc.usd",
    "crypto.eth.usd",
    "ar.dolar.cripto.venta",
  ]);
  const dolarFull = byIds(rows, [
    "ar.dolar.mayorista.venta",
    "ar.dolar.oficial.venta",
    "ar.dolar.tarjeta.venta",
    "ar.dolar.blue.venta",
    "ar.dolar.mep.venta",
    "ar.dolar.ccl.venta",
    "ar.dolar.cripto.venta",
  ]);
  const crypto = byIds(rows, ["crypto.btc.usd", "crypto.eth.usd"]);

  const lastUpdate = rows
    .map(r => r.timestamp)
    .filter((t): t is string => !!t)
    .sort()
    .pop();

  return (
    <main className="px-3.5 py-4 pb-10 max-w-screen-xl mx-auto">
      <header className="mb-4">
        <h1 className="text-[20px] font-semibold tracking-tight">Radar Económico</h1>
        <div className="text-[12px] text-[var(--muted)] mt-1">
          Argentina · USA · Eurozona · China &nbsp;·&nbsp;
          Última actualización: <span className="num">{lastUpdate ? new Date(lastUpdate).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
        </div>
      </header>

      <Section title="Tiles principales" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {tilesPrincipales.map(r => (
            <Tile
              key={r.id}
              row={r}
              sub={r.id === "ar.dolar.ccl.venta" ? `brecha ${brecha(rows)}` : undefined}
            />
          ))}
        </div>
      </Section>

      <Section title="🇦🇷 Argentina · Dólar y brecha" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {dolarFull.map(r => <Tile key={r.id} row={r} />)}
        </div>
      </Section>

      <Section title="₿ Cripto" chip={{ text: "en vivo", tone: "live" }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {crypto.map(r => <Tile key={r.id} row={r} />)}
        </div>
      </Section>

      <Section title="🇺🇸 USA" chip={{ text: "v0.2", tone: "pending" }}>
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl p-4 text-[13px] text-[var(--muted)]">
          Llega en v0.2: Fed Funds, UST 2Y/10Y, CPI, NFP, DXY (vía FRED).
        </div>
      </Section>

      <Section title="🇪🇺 Eurozona" chip={{ text: "v0.2", tone: "pending" }}>
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl p-4 text-[13px] text-[var(--muted)]">
          Llega en v0.2: ECB DFR, HICP, Bund 10Y, BTP spread (vía ECB SDW + Eurostat).
        </div>
      </Section>

      <Section title="🇨🇳 China" chip={{ text: "v0.2", tone: "pending" }}>
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl p-4 text-[13px] text-[var(--muted)]">
          Llega en v0.2: LPR, CPI, PPI, USD/CNY, Caixin PMI (vía FRED + Stooq).
        </div>
      </Section>

      <footer className="mt-8 pt-4 border-t border-[var(--border)] text-center text-[11px] text-[var(--muted)] leading-relaxed">
        Radar Económico v0.1 — Next.js + MongoDB · datos en vivo desde DolarAPI y CoinGecko<br />
        Cron diario 10:00 UTC · próxima iteración: charts, FRED, ArgentinaDatos, BCRA.
      </footer>
    </main>
  );
}
