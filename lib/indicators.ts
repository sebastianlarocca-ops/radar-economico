import type { IndicatorMeta } from "./types";

/**
 * Central registry of every indicator the radar tracks.
 *
 * To add an indicator:
 * 1. Add a row here with `source` + the matching source-config block.
 * 2. Make sure the source module knows how to handle it (it reads this registry).
 *
 * IDs follow the convention: <region>.<category>.<detail>
 */
export const INDICATORS: IndicatorMeta[] = [
  // ============================================
  // AR — FX (DolarAPI for current, ArgentinaDatos for history)
  // ============================================
  { id: "ar.dolar.oficial.venta",         label: "Dólar oficial (venta)",     region: "AR", category: "fx", unit: "ARS", decimals: 0, source: "dolarapi", dolarapi: { casa: "oficial", leg: "venta" } },
  { id: "ar.dolar.oficial.compra",        label: "Dólar oficial (compra)",    region: "AR", category: "fx", unit: "ARS", decimals: 0, source: "dolarapi", dolarapi: { casa: "oficial", leg: "compra" } },
  { id: "ar.dolar.mayorista.venta",       label: "Dólar mayorista A3500",     region: "AR", category: "fx", unit: "ARS", decimals: 0, source: "dolarapi", dolarapi: { casa: "mayorista", leg: "venta" } },
  { id: "ar.dolar.blue.venta",            label: "Dólar blue (venta)",        region: "AR", category: "fx", unit: "ARS", decimals: 0, source: "dolarapi", dolarapi: { casa: "blue", leg: "venta" } },
  { id: "ar.dolar.mep.venta",             label: "Dólar MEP (venta)",         region: "AR", category: "fx", unit: "ARS", decimals: 0, source: "dolarapi", dolarapi: { casa: "bolsa", leg: "venta" } },
  { id: "ar.dolar.ccl.venta",             label: "Dólar CCL (venta)",         region: "AR", category: "fx", unit: "ARS", decimals: 0, source: "dolarapi", dolarapi: { casa: "contadoconliqui", leg: "venta" } },
  { id: "ar.dolar.cripto.venta",          label: "Dólar cripto / USDT",       region: "AR", category: "fx", unit: "ARS", decimals: 0, source: "dolarapi", dolarapi: { casa: "cripto", leg: "venta" } },
  { id: "ar.dolar.tarjeta.venta",         label: "Dólar tarjeta",             region: "AR", category: "fx", unit: "ARS", decimals: 0, source: "dolarapi", dolarapi: { casa: "tarjeta", leg: "venta" } },

  // ============================================
  // AR — Risk & inflation (ArgentinaDatos)
  // ============================================
  { id: "ar.riesgo_pais",                 label: "Riesgo país (EMBI+ AR)",    region: "AR", category: "risk",       unit: "BPS",    decimals: 0, source: "argentinadatos", argentinadatos: { type: "riesgo_pais" } },
  { id: "ar.ipc.mensual",                 label: "IPC mensual",               region: "AR", category: "inflation",  unit: "PCT",    decimals: 1, source: "argentinadatos", argentinadatos: { type: "ipc" } },

  // ============================================
  // AR — Monetary / fiscal (BCRA Principales Variables)
  // ============================================
  { id: "ar.bcra.tasa_politica",          label: "Tasa pases O/N",            region: "AR", category: "rates",  unit: "PCT", decimals: 2, source: "bcra", bcra: { pattern: /pases entre terceros.*1 d[ií]a/i } },
  { id: "ar.bcra.reservas",               label: "Reservas internacionales",  region: "AR", category: "fiscal", unit: "USD", decimals: 0, source: "bcra", bcra: { pattern: /reservas\s+internacionales/i } },
  { id: "ar.bcra.base_monetaria",         label: "Base monetaria",            region: "AR", category: "rates",  unit: "ARS", decimals: 0, source: "bcra", bcra: { pattern: /base\s+monetaria/i } },

  // ============================================
  // Crypto (CoinGecko)
  // ============================================
  { id: "crypto.btc.usd",                 label: "Bitcoin",                   region: "GLOBAL", category: "crypto", unit: "USD", decimals: 0, source: "coingecko", coingecko: { coin_id: "bitcoin",  vs: "usd" } },
  { id: "crypto.eth.usd",                 label: "Ethereum",                  region: "GLOBAL", category: "crypto", unit: "USD", decimals: 0, source: "coingecko", coingecko: { coin_id: "ethereum", vs: "usd" } },

  // ============================================
  // USA (FRED)
  // ============================================
  { id: "us.fed_funds.upper",             label: "Fed Funds (rango superior)", region: "US", category: "rates",     unit: "PCT", decimals: 2, source: "fred", fred: { series_id: "DFEDTARU" } },
  { id: "us.ust.dgs10",                   label: "UST 10Y",                    region: "US", category: "rates",     unit: "PCT", decimals: 2, source: "fred", fred: { series_id: "DGS10" } },
  { id: "us.cpi.yoy",                     label: "CPI YoY",                    region: "US", category: "inflation", unit: "PCT", decimals: 1, source: "fred", fred: { series_id: "CPIAUCSL", units: "pc1" } },
  { id: "us.unrate",                      label: "Unemployment rate",          region: "US", category: "activity",  unit: "PCT", decimals: 1, source: "fred", fred: { series_id: "UNRATE" } },
  { id: "us.payems",                      label: "Nonfarm Payrolls",           region: "US", category: "activity",  unit: "NUMBER", decimals: 0, source: "fred", fred: { series_id: "PAYEMS" } },
  { id: "us.dxy_broad",                   label: "USD index (broad TW)",       region: "US", category: "fx",        unit: "INDEX", decimals: 2, source: "fred", fred: { series_id: "DTWEXBGS" } },

  // ============================================
  // EU (ECB SDW — SDMX REST, no API key needed)
  // PMI Compuesto y ZEW omitidos: son de Markit/ZEW y no están en ECB SDW.
  // BTP-Bund spread pendiente: requiere serie adicional IRS Italy 10Y.
  // ============================================
  { id: "eu.ecb.dfr",       label: "ECB DFR",          region: "EU", category: "rates",     unit: "PCT",   decimals: 2, source: "ecb", ecb: { flow: "FM",  key: "B.U2.EUR.4F.KR.DFR.LEV" } },
  { id: "eu.hicp.yoy",      label: "HICP YoY",          region: "EU", category: "inflation", unit: "PCT",   decimals: 1, source: "ecb", ecb: { flow: "ICP", key: "M.U2.N.000000.4.ANR" } },
  { id: "eu.fx.eurusd",     label: "EUR/USD",            region: "EU", category: "fx",        unit: "RATIO", decimals: 4, source: "ecb", ecb: { flow: "EXR", key: "D.USD.EUR.SP00.A" } },
  { id: "eu.rates.bund10y", label: "Bund 10Y (AAA EZ)", region: "EU", category: "rates",     unit: "PCT",   decimals: 2, source: "ecb", ecb: { flow: "YC",  key: "B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y" } },

  // ============================================
  // China (FRED mirrors)
  // ============================================
  { id: "cn.cpi.yoy",                     label: "CPI YoY",                    region: "CN", category: "inflation", unit: "PCT",   decimals: 1, source: "fred", fred: { series_id: "CHNCPIALLMINMEI", units: "pc1" } },
  { id: "cn.fx.usdcny",                   label: "USD/CNY",                    region: "CN", category: "fx",        unit: "RATIO", decimals: 4, source: "fred", fred: { series_id: "DEXCHUS" } },
];

/** Map for O(1) lookup. */
export const INDICATOR_BY_ID: Record<string, IndicatorMeta> = Object.fromEntries(
  INDICATORS.map(i => [i.id, i])
);

/** Filter helpers. */
export function indicatorsBySource(source: IndicatorMeta["source"]): IndicatorMeta[] {
  return INDICATORS.filter(i => i.source === source);
}
