// lib/unsubscribe.ts
//
// HMAC-signed token utilities for one-click unsubscribe links.
// Tokens carry the email + clientSlug + issued-at timestamp; the signature
// is HMAC-SHA256 over the payload using process.env.UNSUBSCRIBE_SECRET.
// Tokens older than 365 days are rejected.

import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 365 days

type TokenPayload = {
  email: string;
  clientSlug: string;
  iat: number;
};

export type VerifyResult =
  | { valid: true; email: string; clientSlug: string }
  | { valid: false; reason: "malformed" | "invalid_signature" | "expired" | "missing_secret" };

function getSecret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s) throw new Error("Missing required env var: UNSUBSCRIBE_SECRET");
  return s;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(payloadB64: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(payloadB64).digest());
}

export function generateToken(email: string, clientSlug: string): string {
  const secret = getSecret();
  const payload: TokenPayload = {
    email: email.trim().toLowerCase(),
    clientSlug,
    iat: Date.now(),
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sigB64 = sign(payloadB64, secret);
  return `${payloadB64}.${sigB64}`;
}

export function verifyToken(token: string): VerifyResult {
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { valid: false, reason: "missing_secret" };
  }

  if (typeof token !== "string" || !token.includes(".")) {
    return { valid: false, reason: "malformed" };
  }
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSig = sign(payloadB64, secret);
  const a = Buffer.from(expectedSig, "utf-8");
  const b = Buffer.from(sigB64, "utf-8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "invalid_signature" };
  }

  let payload: TokenPayload;
  try {
    const json = base64UrlDecode(payloadB64).toString("utf-8");
    const parsed = JSON.parse(json) as Partial<TokenPayload>;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.clientSlug !== "string" ||
      typeof parsed.iat !== "number"
    ) {
      return { valid: false, reason: "malformed" };
    }
    payload = parsed as TokenPayload;
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (Date.now() - payload.iat > TOKEN_TTL_MS) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, email: payload.email, clientSlug: payload.clientSlug };
}
