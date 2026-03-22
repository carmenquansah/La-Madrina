/**
 * In-process rate limit for public quote estimates (per IP).
 */

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;

type Bucket = { count: number; windowStart: number };

const ipBuckets = new Map<string, Bucket>();

export function checkShopQuoteRateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
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
