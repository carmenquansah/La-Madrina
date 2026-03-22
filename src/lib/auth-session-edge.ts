/**
 * Edge-safe session verification (Web Crypto). Must match HMAC + payload format in auth.ts.
 * Used by Next.js middleware only — do not import Node crypto here.
 */
import type { SessionPayload } from "@/lib/auth-types";

function getSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) return null;
  return s;
}

function base64UrlToBytes(encoded: string): Uint8Array | null {
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function decodePayload<T>(encoded: string): T | null {
  try {
    const bytes = base64UrlToBytes(encoded);
    if (!bytes) return null;
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function bytesToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i];
  return out === 0;
}

async function signPayload(encodedPayload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );
  return bytesToBase64Url(sig);
}

/** Verify admin session token; returns null if invalid, expired, or secret missing. */
export async function verifySessionEdge(token: string): Promise<SessionPayload | null> {
  const secret = getSecret();
  if (!secret) return null;

  const i = token.lastIndexOf(".");
  if (i === -1) return null;
  const encoded = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!encoded || !sig) return null;

  const expectedSig = await signPayload(encoded, secret);
  if (!timingSafeEqualStr(expectedSig, sig)) return null;

  const payload = decodePayload<SessionPayload>(encoded);
  if (!payload || !payload.adminId || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
