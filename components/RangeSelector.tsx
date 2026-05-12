"use client";

export type RangeDays = 30 | 90 | 365 | "max";

const OPTIONS: { label: string; value: RangeDays }[] = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1a", value: 365 },
  { label: "Máx", value: "max" },
];

export function RangeSelector({
  value,
  onChange,
}: {
  value: RangeDays;
  onChange: (v: RangeDays) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        background: "var(--chip-bg)",
        padding: 3,
        borderRadius: 9,
        marginTop: 4,
      }}
      role="tablist"
      aria-label="Rango temporal"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              background: active ? "var(--surface)" : "transparent",
              border: "none",
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: active ? "var(--text)" : "var(--muted)",
              borderRadius: 7,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
