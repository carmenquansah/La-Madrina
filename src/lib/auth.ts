/**
 * Admin session: signed cookie, no DB lookup.
 * Payload: { adminId, email, exp }. Verify in middleware and API routes.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { COOKIE_NAME, type SessionPayload } from "@/lib/auth-types";

const TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export type { SessionPayload };
export { COOKIE_NAME };

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return s;
}

function encodePayload(payload: object): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload<T>(encoded: string): T | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function createSession(adminId: string, email: string): string {
  const payload = { adminId, email, exp: Math.floor(Date.now() / 1000) + TTL_SEC };
  const encoded = encodePayload(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
  const i = token.lastIndexOf(".");
  if (i === -1) return null;
  const encoded = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!verify(encoded, sig)) return null;
  const payload = decodePayload<SessionPayload>(encoded);
  if (!payload || !payload.adminId || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function getSessionFromRequest(request: Request): SessionPayload | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const value = match?.[1]?.trim();
  if (!value) return null;
  return verifySession(decodeURIComponent(value));
}

/** Build Set-Cookie value for session (use in Response headers). */
export function sessionCookieValue(token: string, maxAge = TTL_SEC): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

/** Build Set-Cookie value to clear session. */
export function clearSessionCookieValue(): string {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
