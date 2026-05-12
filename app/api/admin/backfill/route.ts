import { NextRequest, NextResponse } from "next/server";
import { runBackfill, type BackfillSource } from "@/lib/backfill";
import { yearsAgoStartOfDayUtc, startOfDayUtc } from "@/lib/dates";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

const ALLOWED: BackfillSource[] = ["argentinadatos", "bcra", "fred", "coingecko", "all"];

/**
 * POST /api/admin/backfill?source=<src>&years=5
 * - source: one of "argentinadatos" | "bcra" | "fred" | "coingecko" | "all" (default "all")
 * - years:  number of years of history (default 5)
 * - from:   alternatively, an ISO date YYYY-MM-DD (overrides `years`)
 *
 * Each source's failure is isolated; total Vercel timeout is 60s,
 * so for "all" the user should run sources separately if a single bulk run times out.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sourceParam = (url.searchParams.get("source") || "all").toLowerCase() as BackfillSource;
  if (!ALLOWED.includes(sourceParam)) {
    return NextResponse.json({ ok: false, error: `Invalid source. Allowed: ${ALLOWED.join(", ")}` }, { status: 400 });
  }

  const fromIso = url.searchParams.get("from");
  let from: Date;
  if (fromIso) {
    from = startOfDayUtc(fromIso);
  } else {
    const years = parseInt(url.searchParams.get("years") || "5", 10);
    from = yearsAgoStartOfDayUtc(Number.isFinite(years) ? years : 5);
  }

  try {
    const result = await runBackfill(sourceParam, from);
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = POST;
