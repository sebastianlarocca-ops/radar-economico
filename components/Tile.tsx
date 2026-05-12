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
    return new Intl.NumberFormat("en-US", {
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
  const m = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${String(dt.getUTCDate()).padStart(2,"0")} ${m[dt.getUTCMonth()]} · ${String(dt.getUTCHours()).padStart(2,"0")}:${String(dt.getUTCMinutes()).padStart(2,"0")}`;
}

export function Tile({
  row,
  sub,
  sparkline,
  sparkColor = "#5B9DFF",
  info,
  staleAfterDays,
  glowColor,
}: {
  row: LatestRow;
  sub?: string;
  sparkline?: DataPoint[];
  sparkColor?: string;
  info?: string;
  staleAfterDays?: number;
  glowColor?: string;
}) {
  const isStale =
    staleAfterDays != null &&
    row.timestamp != null &&
    (Date.now() - new Date(row.timestamp).getTime()) / 86400000 > staleAfterDays;

  const glow = glowColor ?? (sparkColor + "29");

  return (
    <div
      className="mp-card mp-tile mp-tile-glow"
      style={{
        padding: "16px 16px 0",
        minHeight: 138,
        ["--glow" as string]: glow,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="kpi-label">{row.label}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {isStale && <span className="stale-dot" title="Dato desactualizado" />}
          {info && <InfoTooltip text={info} />}
        </div>
      </div>

      {/* Value */}
      <div className="kpi-value" style={{ marginTop: 10 }}>{formatValue(row)}</div>

      {/* Sub */}
      <div className="kpi-sub" style={{ marginTop: 6 }}>
        {sub || (row.source ? `${row.source} · ${formatTs(row.timestamp)}` : "sin datos")}
      </div>

      {/* Sparkline pinned to bottom */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 50 }}>
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} color={sparkColor} height={50} />
        )}
      </div>
    </div>
  );
}
