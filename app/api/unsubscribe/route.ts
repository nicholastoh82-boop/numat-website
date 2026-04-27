// app/api/unsubscribe/route.ts
//
// One-click unsubscribe endpoint (RFC 8058) plus GET fallback for manual clicks.
//
// Authentication: HMAC token in ?token=... (see lib/unsubscribe.ts).
// On valid token: writes two suppression rows (per-client + global), pauses
// any active sequence on master_leads for that email + client.
//
// Public unauthenticated route — uses Supabase service role key server-side
// only; the key never reaches the browser.

import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function supabaseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function lookupClientId(slug: string): Promise<string | null> {
  const url = required("SUPABASE_URL");
  const qs = new URLSearchParams({ slug: `eq.${slug}`, select: "id" }).toString();
  const res = await fetch(`${url}/rest/v1/clients?${qs}`, {
    method: "GET",
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`clients lookup failed: ${res.status} ${await res.text()}`);
  }
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

async function upsertSuppression(clientId: string, email: string): Promise<void> {
  const url = required("SUPABASE_URL");
  const res = await fetch(`${url}/rest/v1/email_suppression_list?on_conflict=client_id,email`, {
    method: "POST",
    headers: supabaseHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify({
      client_id: clientId,
      email,
      reason: "unsubscribed",
      source: "one_click_email_link",
      notes: null,
    }),
  });
  if (!res.ok) {
    throw new Error(`suppression upsert failed: ${res.status} ${await res.text()}`);
  }
}

async function pauseLeadSequence(clientId: string, email: string): Promise<void> {
  const url = required("SUPABASE_URL");
  const qs = new URLSearchParams({
    email: `eq.${email}`,
    client_id: `eq.${clientId}`,
  }).toString();
  const res = await fetch(`${url}/rest/v1/master_leads?${qs}`, {
    method: "PATCH",
    headers: supabaseHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({
      sequence_paused: true,
      pause_reason: "unsubscribed",
      paused_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`master_leads pause failed: ${res.status} ${await res.text()}`);
  }
}

async function processUnsubscribe(token: string): Promise<
  | { ok: true }
  | { ok: false; status: number; reason: string }
> {
  const result = verifyToken(token);
  if (!result.valid) {
    return { ok: false, status: 400, reason: result.reason };
  }

  const email = result.email.trim().toLowerCase();
  const clientSlug = result.clientSlug;

  const [clientId, globalId] = await Promise.all([
    lookupClientId(clientSlug),
    lookupClientId("global"),
  ]);

  if (!clientId) {
    return { ok: false, status: 400, reason: "unknown_client" };
  }
  if (!globalId) {
    return { ok: false, status: 500, reason: "missing_global_client" };
  }

  await Promise.all([
    upsertSuppression(clientId, email),
    upsertSuppression(globalId, email),
  ]);

  // Pause any active sequence; non-fatal if it fails.
  try {
    await pauseLeadSequence(clientId, email);
  } catch {
    // Suppression succeeded; sequence pause is best-effort.
  }

  return { ok: true };
}

function extractToken(req: Request, body: string | null): string | null {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("token");
  if (fromQuery) return fromQuery;
  if (body) {
    const params = new URLSearchParams(body);
    const fromBody = params.get("token");
    if (fromBody) return fromBody;
  }
  return null;
}

export async function POST(req: Request) {
  let body: string | null = null;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    body = await req.text();
  }

  const token = extractToken(req, body);
  if (!token) {
    return new Response("Invalid or expired unsubscribe link", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const result = await processUnsubscribe(token);
    if (!result.ok) {
      return new Response("Invalid or expired unsubscribe link", {
        status: result.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new Response("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[unsubscribe POST]", msg);
    return new Response("Server error", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe/error?reason=missing_token", url), 307);
  }

  try {
    const result = await processUnsubscribe(token);
    if (!result.ok) {
      return NextResponse.redirect(
        new URL(`/unsubscribe/error?reason=${encodeURIComponent(result.reason)}`, url),
        307,
      );
    }
    return NextResponse.redirect(new URL("/unsubscribe/confirmed", url), 307);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[unsubscribe GET]", msg);
    return NextResponse.redirect(
      new URL("/unsubscribe/error?reason=server_error", url),
      307,
    );
  }
}
