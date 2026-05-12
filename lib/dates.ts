/**
 * Normalize a Date to start-of-day UTC. Used as the canonical timestamp for daily indicators
 * so that backfill rows and daily-cron rows on the same day collapse via upsert.
 */
export function startOfDayUtc(d: Date | string | number): Date {
  const dt = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

/** ISO date string `YYYY-MM-DD` from a Date or parseable string. */
export function isoDate(d: Date | string | number): string {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
}

/** Return a Date N days ago from now, normalized to start-of-day UTC. */
export function daysAgoStartOfDayUtc(days: number): Date {
  return startOfDayUtc(new Date(Date.now() - days * 86400000));
}

/** Return a Date N years ago from now, normalized to start-of-day UTC. */
export function yearsAgoStartOfDayUtc(years: number): Date {
  const now = new Date();
  return startOfDayUtc(new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate())));
}
