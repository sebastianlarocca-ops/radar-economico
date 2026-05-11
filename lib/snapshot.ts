import { getIndicatorValuesCollection } from "./mongodb";
import { fetchDolarApi } from "./sources/dolarapi";
import { fetchCoinGecko } from "./sources/coingecko";
import type { IndicatorValue } from "./types";

export type SnapshotResult = {
  ok: boolean;
  written: number;
  bySource: Record<string, number>;
  errors: Array<{ source: string; message: string }>;
};

/**
 * Run every wired source, collect IndicatorValues, write to Mongo.
 * One failed source does not abort the others — we record the error and continue.
 */
export async function runSnapshot(): Promise<SnapshotResult> {
  const sources: Array<{ name: string; fn: () => Promise<IndicatorValue[]> }> = [
    { name: "dolarapi", fn: fetchDolarApi },
    { name: "coingecko", fn: fetchCoinGecko },
    // Phase 2 v0.2 additions: argentinadatos, bcra, fred
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

  let written = 0;
  if (allValues.length > 0) {
    const col = await getIndicatorValuesCollection();
    const res = await col.insertMany(allValues, { ordered: false });
    written = res.insertedCount;
  }

  return {
    ok: errors.length === 0,
    written,
    bySource,
    errors,
  };
}
