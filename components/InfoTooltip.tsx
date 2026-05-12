"use client";

import { useState } from "react";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Más información"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 2px",
          color: "var(--muted)",
          fontSize: 11,
          lineHeight: 1,
          opacity: 0.7,
          fontFamily: "inherit",
        }}
      >
        ⓘ
      </button>
      {open && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e293b",
            color: "#f1f5f9",
            fontSize: 11,
            lineHeight: 1.4,
            padding: "6px 9px",
            borderRadius: 7,
            whiteSpace: "normal",
            maxWidth: 220,
            zIndex: 50,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
