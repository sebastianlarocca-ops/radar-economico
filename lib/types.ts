// Core data types shared across the app.

/**
 * One observation of one indicator at one point in time.
 * Stored in MongoDB `indicator_values`.
 */
export type IndicatorValue = {
  indicator: string;          // canonical id, e.g. "ar.dolar.oficial.venta"
  timestamp: Date;            // when the observation is valid
  value: number;
  source: string;             // e.g. "dolarapi", "coingecko", "fred"
  meta?: Record<string, unknown>;
};

/**
 * Static description of an indicator — title, region, unit, etc.
 */
export type IndicatorMeta = {
  id: string;
  label: string;              // Spanish display name
  region: "AR" | "US" | "EU" | "CN" | "GLOBAL";
  category: "fx" | "rates" | "inflation" | "activity" | "fiscal" | "markets" | "crypto" | "risk";
  unit: "ARS" | "USD" | "PCT" | "BPS" | "INDEX" | "RATIO";
  decimals?: number;
  source: string;             // "dolarapi" | "coingecko" | "argentinadatos" | "bcra" | "fred"
};
