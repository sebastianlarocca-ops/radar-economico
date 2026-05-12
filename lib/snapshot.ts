import { bulkUpsertValues } from "./mongodb";
import { fetchDolarApiCurrent } from "./sources/dolarapi";
import { fetchCoinGeckoCurrent } from "./sources/coingecko";
import { fetchArgentinaDatosCurrent } from "./sources/argentinadatos";
import { fetchBcraCurrent } from "./sources/bcra";
import { fetchFredCurrent } from "./sources/fred";
import { fetchEcbCurrent } from "./sources/ecb";
import type { IndicatorValue } from "./types";

export type SnapshotResult = {
  ok: boolean;
  upserted: number;
  modified: number;
  bySource: Record<string, number>;
  errors: Array<{ source: string; message: string }>;
};

/**
 * Run every source's "current" fetcher, collect IndicatorValues, upsert to Mongo.
 * One source failing does not abort the others.
 */
export async function runSnapshot(): Promise<SnapshotResult> {
  const sources: Array<{ name: string; fn: () => Promise<IndicatorValue[]> }> = [
    { name: "dolarapi", fn: fetchDolarApiCurrent },
    { name: "coingecko", fn: fetchCoinGeckoCurrent },
    { name: "argentinadatos", fn: fetchArgentinaDatosCurrent },
    { name: "bcra", fn: fetchBcraCurrent },
    { name: "fred", fn: fetchFredCurrent },
    { name: "ecb",  fn: fetchEcbCurrent },
  ];

  const errors: SnapshotResult["errors"] = [];
  const bySource: Record<string, number> = {};
  const allValues: IndicatorValue[] = [];

  await Promise.all(
    sources.map(async ({ name, fn }) => {
      try {
        const values = await fn();
        bySource[name] = values.length;
        allValues.push(...values);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push({ source: name, message });
        bySource[name] = 0;
      }
    })
  );

  const { upserted, modified } = await bulkUpsertValues(allValues);

  return {
    ok: errors.length === 0,
    upserted,
    modified,
    bySource,
    errors,
  };
}
