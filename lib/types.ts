// Core data types shared across the app.

export type Region = "AR" | "US" | "EU" | "CN" | "GLOBAL";
export type Category = "fx" | "rates" | "inflation" | "activity" | "fiscal" | "markets" | "crypto" | "risk";
export type Unit = "ARS" | "USD" | "PCT" | "BPS" | "INDEX" | "RATIO" | "NUMBER";

/**
 * One observation of one indicator at one point in time.
 * Stored in MongoDB `indicator_values`. Compound unique index on (indicator, timestamp).
 */
export type IndicatorValue = {
  indicator: string;          // canonical id, e.g. "ar.dolar.oficial.venta"
  timestamp: Date;            // normalized to start-of-day UTC
  value: number;
  source: string;             // "dolarapi" | "coingecko" | "argentinadatos" | "bcra" | "fred"
  meta?: Record<string, unknown>;
};

/**
 * Per-source config blocks. Only the relevant block is set per indicator.
 */
export type FredConfig = {
  series_id: string;
  // FRED transform: "lin" = level, "pc1" = YoY %, "pch" = period-over-period %, "log" = natural log
  units?: "lin" | "pc1" | "pch" | "pca" | "cch" | "cca" | "log";
};

export type BcraConfig = {
  // We match by description substring against /Monetarias index. ID can drift, names are stable.
  pattern: RegExp;
};

export type ArgentinaDatosConfig = {
  // Path under https://api.argentinadatos.com — set the type so the source module knows the shape.
  type: "riesgo_pais" | "ipc" | "dolar";
  dolar_casa?: "oficial" | "blue" | "bolsa" | "contadoconliqui" | "cripto" | "tarjeta" | "mayorista";
};

export type CoinGeckoConfig = {
  coin_id: "bitcoin" | "ethereum";
  vs: "usd";
};

export type DolarApiConfig = {
  casa: "oficial" | "blue" | "bolsa" | "contadoconliqui" | "cripto" | "tarjeta" | "mayorista";
  leg: "venta" | "compra";
};

/**
 * Static description of an indicator — title, region, unit, and how to fetch it.
 */
export type IndicatorMeta = {
  id: string;
  label: string;              // Spanish display name
  region: Region;
  category: Category;
  unit: Unit;
  decimals?: number;
  source: "dolarapi" | "coingecko" | "argentinadatos" | "bcra" | "fred";
  // Source-specific config (only one set per row)
  fred?: FredConfig;
  bcra?: BcraConfig;
  argentinadatos?: ArgentinaDatosConfig;
  coingecko?: CoinGeckoConfig;
  dolarapi?: DolarApiConfig;
};
