export function Section({
  eyebrow,
  region,
  flag,
  live,
  right,
  children,
  // legacy compat
  title,
  chip,
}: {
  eyebrow?: string;
  region?: string;
  flag?: string;
  live?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  chip?: { text: string; tone?: "live" | "pending" };
}) {
  const showEyebrow = eyebrow ?? title;
  const showLive = live ?? chip?.tone === "live";

  return (
    <section className="mp-section">
      <div className="mp-section-head">
        <div className="mp-section-head-left">
          {region && (
            <div className="mp-region">
              {flag && <span style={{ fontSize: 14 }}>{flag}</span>}
              <span>{region}</span>
            </div>
          )}
          {showEyebrow && <span className="mp-eyebrow">{showEyebrow}</span>}
          {showLive && (
            <span className="pill pill-live">
              <span className="live-dot" />
              En vivo
            </span>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
