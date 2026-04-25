// app/api/internal/analyze-session/route.ts
//
// On demand analyzer for ONE completed NARA chat session.
// Replaces the broken nara-analyzer cron loop.
//
// Auth: Bearer token from CRON_SECRET.
// Body: { "session_id": "uuid-string" }
//
// Idempotency: this endpoint is safe to call repeatedly. The first successful
// (or failed) attempt always stamps session_analyzed_at, so a retry storm or a
// loop trigger cannot drive Claude calls to infinity.

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You analyse a completed chat conversation between a NUMAT website visitor and the NARA assistant. Return STRICT JSON only, no prose, no markdown, no code fences.

You receive the full ordered message list. Each message is tagged [n] role: content. Produce a session level summary.

Schema:
{
  "session": {
    "primary_language": ISO code like en, tl, ceb, ms, id, zh-CN, zh-HK, ja, ko, th, vi, es, fr, de, ar,
    "final_stage": one of discovery interest consideration objection decision ready_to_close closed_won closed_lost based on where the conversation ended,
    "outcome": one of lead_submitted abandoned questions_only disqualified other,
    "close_quality_score": float from 0 to 10 reflecting how well the assistant moved the visitor toward a close and gathered qualifying data,
    "buying_signal_count": integer total buying signals observed across the conversation,
    "objection_count": integer total objections observed across the conversation
  }
}

Rules:
- Skip placeholder markers like [VE Report auto-open] when judging stage and outcome.
- primary_language is the most common language across user messages, defaulting to en.`;

// ---------- helpers ----------

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return constantTimeEquals(header, `Bearer ${secret}`);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function parseLooseJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

// ---------- handler ----------

export async function POST(req: Request) {
  // 1. Auth
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Body validation
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json body" }, { status: 400 });
  }
  const sessionId =
    body && typeof body === "object" && body !== null && "session_id" in body
      ? (body as { session_id?: unknown }).session_id
      : undefined;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return Response.json({ error: "session_id required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 3. Fetch the session, completed only
  const { data: session, error: sErr } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("completed", true)
    .maybeSingle();

  if (sErr) {
    return Response.json({ error: sErr.message }, { status: 500 });
  }

  // 4. Not found or not completed -> skip without calling Claude
  if (!session) {
    return Response.json({ skipped: "not_eligible" });
  }

  // 5. Already analyzed -> skip without calling Claude (idempotency guard)
  if (session.session_analyzed_at) {
    return Response.json({ skipped: "already_analyzed" });
  }

  // 6. Fetch all messages for the session
  const { data: messages, error: mErr } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (mErr) {
    return Response.json({ error: mErr.message }, { status: 500 });
  }

  const stampNow = () => new Date().toISOString();

  // No messages: stamp the session as analyzed with outcome=other so we never retry.
  if (!messages || messages.length === 0) {
    await supabase
      .from("chat_sessions")
      .update({ outcome: "other", session_analyzed_at: stampNow() })
      .eq("id", sessionId);
    return Response.json({ ok: true, session_id: sessionId, status: "parse_failed" });
  }

  // Build the transcript for Claude
  const transcript = messages
    .map((m, i) => {
      const role = m.role === "assistant" ? "ASSISTANT" : "USER";
      const safe = String(m.content ?? "").replace(/\r?\n/g, " ").slice(0, 2000);
      return `[${i + 1}] ${role}: ${safe}`;
    })
    .join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Treat missing config as a failure that still breaks any loop
    await supabase
      .from("chat_sessions")
      .update({ outcome: "other", session_analyzed_at: stampNow() })
      .eq("id", sessionId);
    return Response.json({ ok: true, session_id: sessionId, status: "parse_failed" });
  }

  // 7. Call Claude with prompt caching on the system prompt
  let rawText = "";
  try {
    const claudeRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `Analyse this conversation and return the JSON object.\n\n${transcript}`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      throw new Error(`Claude HTTP ${claudeRes.status}: ${(await claudeRes.text()).slice(0, 300)}`);
    }
    const payload = (await claudeRes.json()) as { content?: Array<{ type: string; text?: string }> };
    rawText = payload?.content?.find((c) => c.type === "text")?.text ?? "";
  } catch (e) {
    console.error("[analyze-session] Claude call failed", sessionId, e);
    await supabase
      .from("chat_sessions")
      .update({ outcome: "other", session_analyzed_at: stampNow() })
      .eq("id", sessionId);
    return Response.json({ ok: true, session_id: sessionId, status: "parse_failed" });
  }

  // 8 + 9. Parse and write back. Always stamp session_analyzed_at so we never loop.
  try {
    const parsed = parseLooseJson(rawText) as
      | {
          session?: {
            primary_language?: string;
            final_stage?: string;
            outcome?: string;
            close_quality_score?: number;
            buying_signal_count?: number;
            objection_count?: number;
          };
        }
      | null;
    const s = parsed?.session;
    if (!s) throw new Error("no session block in response");

    const { error: upErr } = await supabase
      .from("chat_sessions")
      .update({
        outcome: s.outcome ?? null,
        primary_language: s.primary_language ?? null,
        final_stage: s.final_stage ?? null,
        close_quality_score:
          typeof s.close_quality_score === "number" ? s.close_quality_score : null,
        buying_signal_count:
          typeof s.buying_signal_count === "number" ? s.buying_signal_count : 0,
        objection_count: typeof s.objection_count === "number" ? s.objection_count : 0,
        session_analyzed_at: stampNow(),
      })
      .eq("id", sessionId);

    if (upErr) throw new Error(`update failed: ${upErr.message}`);

    return Response.json({ ok: true, session_id: sessionId, status: "analyzed" });
  } catch (e) {
    console.error("[analyze-session] parse or write failed", sessionId, e);
    await supabase
      .from("chat_sessions")
      .update({ outcome: "other", session_analyzed_at: stampNow() })
      .eq("id", sessionId);
    return Response.json({ ok: true, session_id: sessionId, status: "parse_failed" });
  }
}
