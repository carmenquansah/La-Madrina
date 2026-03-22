/**
 * In-process login rate limits (not shared across serverless instances).
 * See README for scaling note (Redis / Upstash).
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_IP = 30;
const MAX_PER_EMAIL = 10;

type Bucket = { count: number; windowStart: number };

const ipBuckets = new Map<string, Bucket>();
const emailBuckets = new Map<string, Bucket>();

function prune(map: Map<string, Bucket>, now: number) {
  for (const [k, v] of map) {
    if (now - v.windowStart > WINDOW_MS) map.delete(k);
  }
}

function retryAfterSec(bucket: Bucket, now: number): number {
  const elapsed = now - bucket.windowStart;
  return Math.max(1, Math.ceil((WINDOW_MS - elapsed) / 1000));
}

function isBlocked(
  map: Map<string, Bucket>,
  key: string,
  now: number,
  max: number
): Bucket | null {
  prune(map, now);
  const b = map.get(key);
  if (!b || now - b.windowStart > WINDOW_MS) return null;
  if (b.count >= max) return b;
  return null;
}

function bump(map: Map<string, Bucket>, key: string, now: number): void {
  prune(map, now);
  let b = map.get(key);
  if (!b || now - b.windowStart > WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
  } else {
    b.count += 1;
  }
}

export function getClientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/** Call after valid body; blocks if already over limit for this window. */
export function checkLoginRateLimit(ip: string, emailLower: string): RateLimitResult {
  const now = Date.now();

  const ipBlock = isBlocked(ipBuckets, ip, now, MAX_PER_IP);
  if (ipBlock) return { ok: false, retryAfterSec: retryAfterSec(ipBlock, now) };

  const emBlock = isBlocked(emailBuckets, emailLower.toLowerCase(), now, MAX_PER_EMAIL);
  if (emBlock) return { ok: false, retryAfterSec: retryAfterSec(emBlock, now) };

  return { ok: true };
}

/** Call after failed auth (wrong password, unknown user, inactive user). */
export function recordLoginFailure(ip: string, emailLower: string): void {
  const now = Date.now();
  bump(ipBuckets, ip, now);
  bump(emailBuckets, emailLower.toLowerCase(), now);
}

/** Clear limits after successful login. */
export function clearLoginRateLimit(ip: string, emailLower: string): void {
  ipBuckets.delete(ip);
  emailBuckets.delete(emailLower.toLowerCase());
}
