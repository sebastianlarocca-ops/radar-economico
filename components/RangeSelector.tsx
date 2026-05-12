"use client";

export type RangeDays = 30 | 90 | 365 | "max";

const OPTIONS: { label: string; value: RangeDays }[] = [
  { label: "30d",  value: 30 },
  { label: "90d",  value: 90 },
  { label: "1a",   value: 365 },
  { label: "Máx",  value: "max" },
];

export function RangeSelector({
  value,
  onChange,
}: {
  value: RangeDays;
  onChange: (v: RangeDays) => void;
}) {
  return (
    <div className="mp-seg" role="tablist" aria-label="Rango temporal">
      {OPTIONS.map((opt) => (
        <button
          key={String(opt.value)}
          role="tab"
          aria-selected={value === opt.value}
          className={value === opt.value ? "is-active" : ""}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
