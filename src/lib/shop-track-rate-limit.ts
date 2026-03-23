/**
 * In-process rate limit for the public order tracking endpoint (per IP).
 * 10 lookups per 15 minutes — enough for normal use, tight enough to
 * block reference enumeration attempts.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 10;

type Bucket = { count: number; windowStart: number };

const ipBuckets = new Map<string, Bucket>();

export function checkTrackRateLimit(
  ip: string
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = ipBuckets.get(ip);
  if (!b || now - b.windowStart > WINDOW_MS) {
    ipBuckets.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (b.count >= MAX_PER_WINDOW) {
    const elapsed = now - b.windowStart;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((WINDOW_MS - elapsed) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}
