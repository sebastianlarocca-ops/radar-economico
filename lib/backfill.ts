import { bulkUpsertValues } from "./mongodb";
import { fetchArgentinaDatosHistory } from "./sources/argentinadatos";
import { fetchBcraHistory } from "./sources/bcra";
import { fetchFredHistory } from "./sources/fred";
import { fetchCoinGeckoHistory } from "./sources/coingecko";
import { fetchEcbHistory } from "./sources/ecb";
import type { IndicatorValue } from "./types";

export type BackfillSource = "argentinadatos" | "bcra" | "fred" | "coingecko" | "ecb" | "all";

export type BackfillResult = {
  ok: boolean;
  source: BackfillSource;
  fromIso: string;
  fetched: number;
  upserted: number;
  modified: number;
  bySource: Record<string, number>;
  errors: Array<{ source: string; message: string }>;
};

const FETCHERS: Record<Exclude<BackfillSource, "all">, (from: Date) => Promise<IndicatorValue[]>> = {
  argentinadatos: fetchArgentinaDatosHistory,
  bcra:           fetchBcraHistory,
  fred:           fetchFredHistory,
  coingecko:      fetchCoinGeckoHistory,
  ecb:            fetchEcbHistory,
};

/**
 * Backfill historical data for the given source (or all sources) since `from`.
 * Each source's failure is captured; other sources still run.
 */
export async function runBackfill(source: BackfillSource, from: Date): Promise<BackfillResult> {
  const targets = source === "all"
    ? (Object.keys(FETCHERS) as Array<Exclude<BackfillSource, "all">>)
    : [source];

  const errors: BackfillResult["errors"] = [];
  const bySource: Record<string, number> = {};
  const allValues: IndicatorValue[] = [];

  for (const t of targets) {
    try {
      const values = await FETCHERS[t](from);
      bySource[t] = values.length;
      allValues.push(...values);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ source: t, message });
      bySource[t] = 0;
    }
  }

  const { upserted, modified } = await bulkUpsertValues(allValues);

  return {
    ok: errors.length === 0,
    source,
    fromIso: from.toISOString().slice(0, 10),
    fetched: allValues.length,
    upserted,
    modified,
    bySource,
    errors,
  };
}
