import { NextRequest, NextResponse } from "next/server";
import { runSnapshot } from "@/lib/snapshot";

// Allow up to 60s — Mongo + multiple external fetches.
export const maxDuration = 60;
// Always run fresh, never cache.
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runSnapshot();
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST mirrors GET, for manual curl invocations.
export const POST = GET;
