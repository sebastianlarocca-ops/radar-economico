import type { IndicatorMeta } from "./types";

/**
 * Central registry of every indicator the radar tracks.
 * Adding a new indicator: add a row here, then add the matching write
 * in the source's fetcher under lib/sources/.
 */
export const INDICATORS: IndicatorMeta[] = [
  // -------- AR FX --------
  { id: "ar.dolar.oficial.venta",         label: "Dólar oficial (venta)",     region: "AR", category: "fx",     unit: "ARS", decimals: 0, source: "dolarapi" },
  { id: "ar.dolar.oficial.compra",        label: "Dólar oficial (compra)",    region: "AR", category: "fx",     unit: "ARS", decimals: 0, source: "dolarapi" },
  { id: "ar.dolar.mayorista.venta",       label: "Dólar mayorista A3500",     region: "AR", category: "fx",     unit: "ARS", decimals: 0, source: "dolarapi" },
  { id: "ar.dolar.blue.venta",            label: "Dólar blue (venta)",        region: "AR", category: "fx",     unit: "ARS", decimals: 0, source: "dolarapi" },
  { id: "ar.dolar.mep.venta",             label: "Dólar MEP (venta)",         region: "AR", category: "fx",     unit: "ARS", decimals: 0, source: "dolarapi" },
  { id: "ar.dolar.ccl.venta",             label: "Dólar CCL (venta)",         region: "AR", category: "fx",     unit: "ARS", decimals: 0, source: "dolarapi" },
  { id: "ar.dolar.cripto.venta",          label: "Dólar cripto / USDT",       region: "AR", category: "fx",     unit: "ARS", decimals: 0, source: "dolarapi" },
  { id: "ar.dolar.tarjeta.venta",         label: "Dólar tarjeta",             region: "AR", category: "fx",     unit: "ARS", decimals: 0, source: "dolarapi" },

  // -------- Crypto --------
  { id: "crypto.btc.usd",                 label: "Bitcoin",                   region: "GLOBAL", category: "crypto", unit: "USD", decimals: 0, source: "coingecko" },
  { id: "crypto.eth.usd",                 label: "Ethereum",                  region: "GLOBAL", category: "crypto", unit: "USD", decimals: 0, source: "coingecko" },
];

/** Map for O(1) lookup. */
export const INDICATOR_BY_ID: Record<string, IndicatorMeta> = Object.fromEntries(
  INDICATORS.map(i => [i.id, i])
);
