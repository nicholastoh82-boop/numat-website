// app/api/cron/nara-analyzer/route.ts
//
// Session sweeper. Replaces the per message analyzer.
// Triggered by Supabase pg_cron every minute.
//
// Flow:
//   1. Verify Authorization: Bearer <CRON_SECRET>
//   2. Auto complete any session where the last message is older than IDLE_MINUTES
//      and completed is still false.
//   3. For any completed session where session_analyzed_at IS NULL, run the
//      session analysis (single Haiku 4.5 call covering the full transcript).

import { runSessionAnalysis } from "../../nara/analyze-session/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IDLE_MINUTES = 30;
const ANALYSIS_BATCH = 5;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function supabaseHeaders(): Record<string, string> {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

type Row = Record<string, unknown>;

async function supabaseQuery(path: string): Promise<Row[]> {
  const url = required("SUPABASE_URL");
  const res = await fetch(`${url}${path}`, { method: "GET", headers: supabaseHeaders() });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as Row[];
}

async function supabasePatch(path: string, body: Record<string, unknown>): Promise<void> {
  const url = required("SUPABASE_URL");
  const res = await fetch(`${url}${path}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status} ${await res.text()}`);
}

async function autoCompleteIdleSessions(): Promise<string[]> {
  // Find sessions where completed=false and the most recent chat_message is older than IDLE_MINUTES.
  // Using a view-less approach: pull candidate sessions, then check each.
  const cutoff = new Date(Date.now() - IDLE_MINUTES * 60_000).toISOString();

  const sessions = await supabaseQuery(
    `/rest/v1/chat_sessions?select=id,started_at,completed&completed=eq.false&started_at=lt.${encodeURIComponent(cutoff)}&limit=50`,
  );

  const closedIds: string[] = [];
  for (const s of sessions) {
    const id = String(s.id);
    // Look at the latest message timestamp
    const msgs = await supabaseQuery(
      `/rest/v1/chat_messages?select=created_at&session_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=1`,
    );
    const last = msgs[0];
    const lastAt = last ? String(last.created_at) : String(s.started_at);
    if (new Date(lastAt).getTime() < Date.now() - IDLE_MINUTES * 60_000) {
      await supabasePatch(`/rest/v1/chat_sessions?id=eq.${encodeURIComponent(id)}`, { completed: true });
      closedIds.push(id);
    }
  }
  return closedIds;
}

async function pendingAnalysisSessions(): Promise<string[]> {
  const rows = await supabaseQuery(
    `/rest/v1/chat_sessions?select=id&completed=eq.true&session_analyzed_at=is.null&order=started_at.asc&limit=${ANALYSIS_BATCH}`,
  );
  return rows.map((r) => String(r.id));
}

async function handle(): Promise<Response> {
  const started = Date.now();

  let autoCompleted: string[] = [];
  try {
    autoCompleted = await autoCompleteIdleSessions();
  } catch (e) {
    console.error("[nara-cron] auto complete failed:", e);
  }

  const pending = await pendingAnalysisSessions();

  const results = await Promise.allSettled(pending.map((id) => runSessionAnalysis(id)));

  let analyzed = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.ok) {
      analyzed++;
    } else {
      failed++;
      const err =
        r.status === "rejected"
          ? r.reason instanceof Error
            ? r.reason.message
            : String(r.reason)
          : (r.value as { error?: string }).error ?? "unknown";
      errors.push({ id: pending[i], error: err });
    }
  }

  return Response.json({
    ok: true,
    auto_completed: autoCompleted,
    pending_analysis_picked: pending.length,
    analyzed,
    failed,
    errors: errors.length ? errors : undefined,
    ms: Date.now() - started,
  });
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  try {
    return await handle();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  try {
    return await handle();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
