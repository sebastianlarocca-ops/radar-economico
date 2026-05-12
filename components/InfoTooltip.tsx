"use client";

import { useState } from "react";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        className="info-i"
        aria-label="Más información"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
          <circle cx="6" cy="3.5" r="0.7" fill="currentColor" />
          <path d="M6 5.4 V8.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </button>
      {open && text && (
        <span
          className="mp-tooltip"
          style={{ bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", width: 230 }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
