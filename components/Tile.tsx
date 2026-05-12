import type { LatestRow } from "@/app/api/snapshots/latest/route";
import { Sparkline, type DataPoint } from "./charts";
import { InfoTooltip } from "./InfoTooltip";

function formatValue(row: LatestRow): string {
  if (row.value == null || !isFinite(row.value)) return "—";
  const d = row.decimals ?? 0;
  if (row.unit === "ARS") {
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS",
      maximumFractionDigits: d, minimumFractionDigits: d,
    }).format(row.value);
  }
  if (row.unit === "USD") {
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "USD",
      maximumFractionDigits: d, minimumFractionDigits: d,
    }).format(row.value);
  }
  if (row.unit === "PCT") {
    return (row.value >= 0 ? "+" : "") + row.value.toFixed(d) + "%";
  }
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: d }).format(row.value);
}

function formatTs(ts: string | null): string {
  if (!ts) return "sin datos";
  const dt = new Date(ts);
  if (isNaN(dt.getTime())) return "sin datos";
  return dt.toLocaleString("es-AR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function Tile({
  row,
  sub,
  sparkline,
  sparkColor,
  info,
  staleAfterDays,
}: {
  row: LatestRow;
  sub?: string;
  sparkline?: DataPoint[];
  sparkColor?: string;
  info?: string;
  staleAfterDays?: number;
}) {
  const change = (row.meta && typeof row.meta.change_24h_pct === "number")
    ? row.meta.change_24h_pct as number
    : null;

  const isStale = staleAfterDays != null && row.timestamp != null
    && (Date.now() - new Date(row.timestamp).getTime()) / 86400000 > staleAfterDays;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-1 min-h-[100px]">
      <div className="flex items-center gap-1">
        <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--muted)] flex-1">{row.label}</div>
        {isStale && (
          <span
            title="Dato desactualizado"
            className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full bg-amber-500 text-white text-[8px] font-bold shrink-0"
          >!</span>
        )}
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="text-[19px] font-semibold tracking-tight leading-tight num">{formatValue(row)}</div>
      {change != null && (
        <div className={`text-[11px] font-medium ${change >= 0 ? "text-[var(--pos)]" : "text-[var(--neg)]"}`}>
          24h {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </div>
      )}
      <div className="text-[11px] text-[var(--muted)] mt-auto">
        {sub || (row.source ? `${row.source} · ${formatTs(row.timestamp)}` : "sin datos")}
      </div>
      {sparkline && sparkline.length > 0 && (
        <Sparkline data={sparkline} color={sparkColor ?? "#2563eb"} />
      )}
    </div>
  );
}
