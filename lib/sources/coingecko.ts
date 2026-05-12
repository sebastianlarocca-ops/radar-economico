import type { IndicatorValue } from "../types";
import { indicatorsBySource } from "../indicators";
import { startOfDayUtc, isoDate } from "../dates";

const BASE = "https://api.coingecko.com/api/v3";

type SimplePriceResponse = Record<string, { usd?: number; usd_24h_change?: number }>;
type MarketChartResponse = { prices: Array<[number, number]> };

/** Current spot prices for all crypto indicators in the registry. */
export async function fetchCoinGeckoCurrent(): Promise<IndicatorValue[]> {
  const indicators = indicatorsBySource("coingecko");
  const ids = Array.from(new Set(indicators.map(i => i.coingecko?.coin_id).filter(Boolean))) as string[];
  if (ids.length === 0) return [];
  const url = `${BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const r = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.2" },
    next: { revalidate: 0 },
  });
  if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
  const data = (await r.json()) as SimplePriceResponse;
  const ts = startOfDayUtc(new Date());
  const out: IndicatorValue[] = [];
  for (const ind of indicators) {
    const coin = ind.coingecko?.coin_id;
    if (!coin) continue;
    const price = data[coin]?.usd;
    if (price == null) continue;
    out.push({
      indicator: ind.id,
      timestamp: ts,
      value: price,
      source: "coingecko",
      meta: { coin, change_24h_pct: data[coin]?.usd_24h_change ?? null, fetched_at: new Date().toISOString() },
    });
  }
  return out;
}

/**
 * Historical daily series for each crypto indicator.
 * CoinGecko free tier: `days=N` returns up to N days of history.
 * For 5 years (~1825 days), the free endpoint may auto-coarsen to daily granularity (which is what we want).
 */
export async function fetchCoinGeckoHistory(from: Date): Promise<IndicatorValue[]> {
  const indicators = indicatorsBySource("coingecko");
  const out: IndicatorValue[] = [];
  const days = Math.max(1, Math.ceil((Date.now() - from.getTime()) / 86400000));
  for (const ind of indicators) {
    const coin = ind.coingecko?.coin_id;
    if (!coin) continue;
    try {
      const url = `${BASE}/coins/${coin}/market_chart?vs_currency=usd&days=${days}`;
      const r = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.2" },
        next: { revalidate: 0 },
      });
      if (!r.ok) {
        console.warn(`[coingecko] history HTTP ${r.status} for ${coin}`);
        continue;
      }
      const data = (await r.json()) as MarketChartResponse;
      // Downsample to one point per day (last price observed that day).
      const byDay = new Map<string, { ts: number; price: number }>();
      for (const [ts, price] of data.prices ?? []) {
        const day = isoDate(new Date(ts));
        byDay.set(day, { ts, price });
      }
      for (const [day, rec] of byDay) {
        out.push({
          indicator: ind.id,
          timestamp: startOfDayUtc(day),
          value: rec.price,
          source: "coingecko",
          meta: { coin, source_ts: new Date(rec.ts).toISOString() },
        });
      }
      // Small spacing between coins to be polite with CoinGecko's free tier rate limit.
      await new Promise(res => setTimeout(res, 200));
    } catch (e) {
      console.warn(`[coingecko] history failed for ${coin}:`, e);
    }
  }
  return out;
}
