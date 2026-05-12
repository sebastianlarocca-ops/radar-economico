import { DashboardClient } from "./DashboardClient";
import type { LatestRow } from "@/app/api/snapshots/latest/route";

type SeriesPoint = { t: string; v: number };

export function Dashboard({
  latest,
  history,
}: {
  latest: LatestRow[];
  history: Record<string, SeriesPoint[]>;
}) {
  return <DashboardClient latest={latest} initialHistory={history} />;
}
