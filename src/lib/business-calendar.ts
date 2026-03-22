/**
 * Business reporting uses a single IANA timezone (default Ghana / Accra).
 * Periods and daily buckets align to calendar midnights in that zone.
 */
export function getBusinessTimeZone(): string {
  return process.env.BUSINESS_TIMEZONE ?? "Africa/Accra";
}

/** YYYY-MM-DD for the instant `d` in the business timezone. */
export function businessDateKey(d: Date, timeZone = getBusinessTimeZone()): string {
  return d.toLocaleDateString("en-CA", { timeZone });
}

/**
 * Gregorian calendar add in UTC components (works with Accra; civil day shift for other zones is acceptable for our bakery default).
 */
export function addDaysToDateKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const u = new Date(Date.UTC(y, m - 1, d + delta));
  return u.toISOString().slice(0, 10);
}

/** UTC instant of the first millisecond that belongs to `dateKey` in `timeZone`. */
export function startOfBusinessDayUtc(dateKey: string, timeZone = getBusinessTimeZone()): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const anchor = Date.UTC(y, m - 1, d, 12, 0, 0);
  const keyAt = (ms: number) => new Date(ms).toLocaleDateString("en-CA", { timeZone });

  let lo = anchor - 48 * 3600000;
  let hi = anchor + 48 * 3600000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (keyAt(mid) < dateKey) lo = mid + 1;
    else hi = mid;
  }
  if (keyAt(lo) !== dateKey) {
    throw new Error(`Could not resolve start of business day for ${dateKey} in ${timeZone}`);
  }
  return new Date(lo);
}

/** Last N calendar days in the business TZ, inclusive of "today" there. `[since, untilExclusive)` for queries. */
export function currentPeriodRange(days: number, timeZone = getBusinessTimeZone()) {
  const todayKey = businessDateKey(new Date(), timeZone);
  const firstKey = addDaysToDateKey(todayKey, -(days - 1));
  const since = startOfBusinessDayUtc(firstKey, timeZone);
  const untilExclusive = startOfBusinessDayUtc(addDaysToDateKey(todayKey, 1), timeZone);
  return {
    since,
    untilExclusive,
    firstDateKey: firstKey,
    lastDateKey: todayKey,
    timeZone,
  };
}

/** Same-length window immediately before the current one (ends where current starts). */
export function previousPeriodRange(sinceCurrent: Date, days: number, timeZone = getBusinessTimeZone()) {
  const firstKeyCurrent = businessDateKey(sinceCurrent, timeZone);
  const prevLastKey = addDaysToDateKey(firstKeyCurrent, -1);
  const prevFirstKey = addDaysToDateKey(prevLastKey, -(days - 1));
  const prevSince = startOfBusinessDayUtc(prevFirstKey, timeZone);
  const prevUntilExclusive = sinceCurrent;
  return { prevSince, prevUntilExclusive, prevFirstKey, prevLastKey };
}

export function* iterateBusinessDateKeys(firstKey: string, lastKey: string): Generator<string> {
  let k = firstKey;
  while (k <= lastKey) {
    yield k;
    k = addDaysToDateKey(k, 1);
  }
}
