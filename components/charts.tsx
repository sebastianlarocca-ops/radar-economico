"use client";

import { useRef, useEffect, useState, useId } from "react";

export type DataPoint = { t: string; v: number };

// Cardinal spline: smooth bezier through all points, tension 0–1
function cardinalPath(pts: [number, number][], tension = 0.3): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
  }
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// ── Sparkline ──────────────────────────────────────────────────────────
export function Sparkline({
  data,
  color = "#5B9DFF",
  height = 50,
}: {
  data: DataPoint[];
  color?: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(220);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width || 220);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length < 2) return <div ref={ref} style={{ height }} />;

  const vals = data.map((d) => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = 2;
  const xStep = (w - pad * 2) / (vals.length - 1 || 1);
  const yRange = max - min || 1;

  const pts: [number, number][] = vals.map((v, i) => [
    pad + i * xStep,
    height - pad - ((v - min) / yRange) * (height - pad * 2),
  ]);
  const linePath = cardinalPath(pts, 0.3);
  const last = pts[pts.length - 1];
  const areaPath = `${linePath} L ${last[0]} ${height} L ${pts[0][0]} ${height} Z`;

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}g`} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={areaPath} fill={`url(#${id}a)`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={`url(#${id}g)`}
        />
      </svg>
    </div>
  );
}

// ── LineChart ──────────────────────────────────────────────────────────
export type LineDataset = {
  key?: string;
  label: string;
  data: DataPoint[];
  color: string;
  yAxisID?: string;
};

export function LineChart({
  datasets,
  height = 240,
  showLegend = false,
  formatY,
  unit = "",
  yAxisLabel: _yAxisLabel,
  yAxisLabelRight: _yAxisLabelRight,
}: {
  datasets: LineDataset[];
  height?: number;
  showLegend?: boolean;
  formatY?: (v: number) => string;
  unit?: string;
  yAxisLabel?: string;
  yAxisLabelRight?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState<{ idx: number } | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const toggleHidden = (key: string) =>
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const cid = useId().replace(/:/g, "");

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(300, e.contentRect.width));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const padL = 48, padR = 16, padT = 14, padB = 26;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  const longestDs = datasets.reduce(
    (a, b) => (a.data.length >= b.data.length ? a : b),
    datasets[0]
  );
  const N = longestDs?.data.length ?? 0;

  if (N < 2) {
    return (
      <div
        ref={wrapRef}
        style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t-3)", fontSize: 12 }}
      >
        Acumulando historial…
      </div>
    );
  }

  // Y domain across all datasets
  const allVals = datasets.flatMap((ds) => ds.data.map((d) => d.v));
  const dataMin = Math.min(...allVals);
  const dataMax = Math.max(...allVals);
  const range = dataMax - dataMin || 1;
  const yMin = dataMin - range * 0.08;
  const yMax = dataMax + range * 0.08;

  const xOf = (i: number, n = N) => padL + (i / (n - 1)) * innerW;
  const yOf = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const yTickCount = 5;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(yMin + (i / yTickCount) * (yMax - yMin));
  }

  const xTicks: number[] = [];
  const step = Math.max(1, Math.floor(N / 6));
  for (let i = 0; i < N; i += step) xTicks.push(i);
  if (xTicks[xTicks.length - 1] !== N - 1) xTicks.push(N - 1);

  const fmtDate = (t: string) => {
    const dt = new Date(t);
    const m = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return String(dt.getUTCDate()).padStart(2, "0") + " " + m[dt.getUTCMonth()];
  };

  const fmtY = formatY ?? ((v: number) => v.toFixed(2));

  function pathFor(data: DataPoint[], n: number): string {
    if (data.length < 2) return "";
    const pts: [number, number][] = data.map((p, i) => [xOf(i, n), yOf(p.v)]);
    return cardinalPath(pts, 0.3);
  }

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < padL || x > padL + innerW) { setHover(null); return; }
    const idx = Math.min(Math.max(0, Math.round(((x - padL) / innerW) * (N - 1))), N - 1);
    setHover({ idx });
  };

  const hoverX = hover != null ? xOf(hover.idx) : 0;
  const primaryDs = (hoverKey ? datasets.find((d) => (d.key ?? d.label) === hoverKey && !hiddenKeys.has(hoverKey)) : null) ?? datasets.find((d) => !hiddenKeys.has(d.key ?? d.label)) ?? datasets[0];

  return (
    <div>
      <div ref={wrapRef} style={{ width: "100%", position: "relative" }}>
        <svg
          width={w}
          height={height}
          viewBox={`0 0 ${w} ${height}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          style={{ display: "block" }}
        >
          <defs>
            <linearGradient id={`${cid}area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryDs.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={primaryDs.color} stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${cid}cp`}>
              <rect x={padL} y={padT - 4} width={innerW} height={innerH + 8} />
            </clipPath>
          </defs>

          {/* Y gridlines */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padL} x2={padL + innerW}
                y1={yOf(t)} y2={yOf(t)}
                stroke="rgba(148,163,184,0.06)"
                strokeWidth="1"
              />
              <text x={padL - 8} y={yOf(t) + 3} textAnchor="end" className="axis-tick">
                {fmtY(t)}
              </text>
            </g>
          ))}

          {/* X ticks */}
          {xTicks.map((i, k) =>
            longestDs.data[i] ? (
              <text key={k} x={xOf(i)} y={height - 8} textAnchor="middle" className="axis-tick">
                {fmtDate(longestDs.data[i].t)}
              </text>
            ) : null
          )}

          {/* Area under hovered series */}
          {hoverKey && (() => {
            const ds = datasets.find((d) => (d.key ?? d.label) === hoverKey && !hiddenKeys.has(hoverKey));
            if (!ds || ds.data.length < 2) return null;
            const d = pathFor(ds.data, ds.data.length);
            const n = ds.data.length;
            const areaPath = `${d} L ${xOf(n - 1, n)} ${padT + innerH} L ${xOf(0, n)} ${padT + innerH} Z`;
            return <path d={areaPath} fill={`url(#${cid}area)`} clipPath={`url(#${cid}cp)`} />;
          })()}

          {/* Series lines */}
          {datasets.map((ds) => {
            const key = ds.key ?? ds.label;
            const hidden = hiddenKeys.has(key);
            const dimmed = hoverKey != null && key !== hoverKey && !hidden;
            const d = pathFor(ds.data, ds.data.length);
            if (!d || hidden) return null;
            return (
              <path
                key={key}
                d={d}
                fill="none"
                stroke={ds.color}
                strokeOpacity={dimmed ? 0.18 : 1}
                strokeWidth={dimmed ? 1.1 : 1.55}
                strokeLinejoin="round"
                strokeLinecap="round"
                clipPath={`url(#${cid}cp)`}
              />
            );
          })}

          {/* Hover crosshair */}
          {hover && (
            <g>
              <line
                x1={hoverX} x2={hoverX}
                y1={padT} y2={padT + innerH}
                stroke="rgba(148,163,184,0.35)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {datasets.map((ds) => {
                const key = ds.key ?? ds.label;
                const pt = ds.data[hover.idx];
                if (hiddenKeys.has(key) || !pt) return null;
                const n = ds.data.length;
                return (
                  <circle
                    key={key}
                    cx={xOf(hover.idx, n)}
                    cy={yOf(pt.v)}
                    r="3.5"
                    fill="#0B1020"
                    stroke={ds.color}
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Hover tooltip */}
        {hover && longestDs.data[hover.idx] && (
          <div
            className="mp-tooltip"
            style={{
              left: Math.min(Math.max(hoverX + 14, 12), w - 200),
              top: padT + 6,
              minWidth: 160,
            }}
          >
            <div style={{ fontSize: 10.5, color: "var(--t-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
              {fmtDate(longestDs.data[hover.idx].t)}
            </div>
            {datasets.map((ds) => {
              const pt = ds.data[hover.idx];
              if (!pt || hiddenKeys.has(ds.key ?? ds.label)) return null;
              return (
                <div key={ds.key ?? ds.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "2px 0", fontSize: 11.5 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--t-2)" }}>
                    <span style={{ width: 8, height: 8, background: ds.color, borderRadius: 2, flexShrink: 0 }} />
                    {ds.label}
                  </span>
                  <span style={{ color: "var(--t-1)", fontFamily: "var(--font-mono, monospace)" }}>
                    {fmtY(pt.v)}{unit}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend pills */}
      {showLegend && datasets.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {datasets.map((ds) => {
            const key = ds.key ?? ds.label;
            return (
              <span
                key={key}
                className={"legend-pill" + (hiddenKeys.has(key) ? " muted" : "") + (hoverKey === key ? " locked" : "")}
                onMouseEnter={() => setHoverKey(key)}
                onMouseLeave={() => setHoverKey(null)}
                onClick={() => toggleHidden(key)}
              >
                <span className="swatch" style={{ background: ds.color }} />
                {ds.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── BarChart (SVG area, used for IPC) ──────────────────────────────────
export function BarChart({
  data,
  color = "#F87171",
  height = 200,
}: {
  data: DataPoint[];
  color?: string;
  height?: number;
}) {
  return (
    <LineChart
      datasets={[{ label: "IPC", data, color }]}
      height={height}
      formatY={(v) => v.toFixed(1)}
      unit="%"
    />
  );
}
