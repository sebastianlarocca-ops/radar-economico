import type { IndicatorValue } from "../types";

const ENDPOINT = "https://api.coingecko.com/api/v3/simple/price";

type CoinGeckoResponse = {
  bitcoin?: { usd?: number; usd_24h_change?: number };
  ethereum?: { usd?: number; usd_24h_change?: number };
};

export async function fetchCoinGecko(): Promise<IndicatorValue[]> {
  const url = `${ENDPOINT}?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true`;
  const r = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "radar-economico/0.1" },
    next: { revalidate: 0 },
  });
  if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
  const data = (await r.json()) as CoinGeckoResponse;
  const out: IndicatorValue[] = [];
  const ts = new Date();
  if (data.bitcoin?.usd != null) {
    out.push({
      indicator: "crypto.btc.usd",
      timestamp: ts,
      value: data.bitcoin.usd,
      source: "coingecko",
      meta: { change_24h_pct: data.bitcoin.usd_24h_change ?? null },
    });
  }
  if (data.ethereum?.usd != null) {
    out.push({
      indicator: "crypto.eth.usd",
      timestamp: ts,
      value: data.ethereum.usd,
      source: "coingecko",
      meta: { change_24h_pct: data.ethereum.usd_24h_change ?? null },
    });
  }
  return out;
}
