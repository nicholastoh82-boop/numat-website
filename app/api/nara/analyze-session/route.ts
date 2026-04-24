// app/api/nara/analyze-session/route.ts
//
// Post session batch analyzer. Replaces the per message analysis flow.
// One Haiku 4.5 call per session summarises every message and the session as a whole.
//
// Auth: Bearer CRON_SECRET. Called from:
//   1. Chat route fire and forget on lead completion
//   2. Cron sweeper for completed sessions with session_analyzed_at IS NULL
//   3. Manual admin retry
//
// Exposes runSessionAnalysis(sessionId) so the cron can invoke directly without HTTP.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You analyse a completed chat conversation between a NUMAT website visitor and the NARA assistant. Return STRICT JSON only, no prose, no markdown, no code fences.

You receive the full ordered message list. Each message is tagged [n] role: content. Produce:

1. A per message analysis array of the same length as the input. Match by the integer index n.
2. A session level summary.

Schema:
{
  "messages": [
    {
      "idx": integer matching [n],
      "language": ISO code like en, tl, ceb, ms, id, zh-CN, zh-HK, ja, ko, th, vi, es, fr, de, ar,
      "dialect": local dialect name or null,
      "content_en": English translation of the message verbatim, or the original if already English,
      "sentiment": one of positive neutral negative hostile excited hesitant ready,
      "buying_signals": array of short tags like ["asked_timeline", "asked_price", "mentioned_quantity", "asked_to_order", "requested_quote", "asked_delivery", "asked_warranty", "compared_skus", "mentioned_project_scale", "ready_to_buy"],
      "objections": array of short tags like ["price_too_high", "need_more_time", "comparing_alternatives", "budget_concern", "quality_doubt", "lead_time_concern"],
      "close_stage": one of discovery interest consideration objection decision ready_to_close closed_won closed_lost,
      "intent_tags": array of short tags like ["hotel_project", "resort_project", "residential", "commercial_fitout", "distributorship", "container_order", "small_order", "bulk_order", "site_visit", "sample_request"]
    }
  ],
  "session": {
    "primary_language": the most common language across user messages,
    "primary_dialect": the most common dialect or null,
    "final_stage": one of discovery interest consideration objection decision ready_to_close closed_won closed_lost based on where the conversation ended,
    "outcome": one of lead_submitted abandoned questions_only disqualified,
    "close_quality_score": float from 0 to 10 reflecting how well the assistant moved the visitor toward a close and gathered qualifying data,
    "buying_signal_count": integer total buying signals across all messages,
    "objection_count": integer total objections across all messages
  }
}

Rules:
- For assistant messages: sentiment neutral, buying_signals and objections empty, close_stage reflects the stage the assistant is guiding toward.
- For user messages: infer everything from content.
- Skip markers like [VE Report auto-open] as assistant neutral placeholders.
- Always return exactly one analysis per input message, in ascending idx.`;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

type Role = "user" | "assistant";

type ChatMessageRow = {
  id: string;
  session_id: string;
  role: Role | string;
  content: string;
  created_at: string;
};

type PerMessage = {
  idx: number;
  language: string;
  dialect: string | null;
  content_en: string;
  sentiment: string;
  buying_signals: string[];
  objections: string[];
  close_stage: string;
  intent_tags: string[];
};

type SessionSummary = {
  primary_language: string;
  primary_dialect: string | null;
  final_stage: string;
  outcome: string;
  close_quality_score: number;
  buying_signal_count: number;
  objection_count: number;
};

type AnalysisResponse = {
  messages: PerMessage[];
  session: SessionSummary;
};

export type SessionAnalysisResult = {
  ok: boolean;
  session_id: string;
  message_count: number;
  analyzed: number;
  error?: string;
};

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

function stripFences(text: string): string {
  return text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
}

function parseLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

async function fetchMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const url = required("SUPABASE_URL");
  const params = new URLSearchParams({
    select: "id,session_id,role,content,created_at",
    session_id: `eq.${sessionId}`,
    order: "created_at.asc",
  });
  const res = await fetch(`${url}/rest/v1/chat_messages?${params.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(),
  });
  if (!res.ok) {
    throw new Error(`fetchMessages failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as ChatMessageRow[];
}

function buildTranscript(messages: ChatMessageRow[]): string {
  return messages
    .map((m, i) => {
      const idx = i + 1;
      const role = m.role === "assistant" ? "ASSISTANT" : "USER";
      const safe = m.content.replace(/\r?\n/g, " ").slice(0, 2000);
      return `[${idx}] ${role}: ${safe}`;
    })
    .join("\n");
}

async function callClaude(transcript: string): Promise<AnalysisResponse | null> {
  const apiKey = required("ANTHROPIC_API_KEY");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
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
          content: `Analyse this conversation and return the JSON.\n\n${transcript}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude failed: ${res.status} ${await res.text()}`);
  }
  const payload = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const raw = payload.content?.find((c) => c.type === "text")?.text ?? "";
  if (!raw) return null;
  const parsed = parseLoose(stripFences(raw));
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Partial<AnalysisResponse>;
  if (!Array.isArray(obj.messages) || !obj.session) return null;
  return obj as AnalysisResponse;
}

async function patchMessage(row: ChatMessageRow, pm: PerMessage): Promise<void> {
  const url = required("SUPABASE_URL");
  const body = {
    detected_language: pm.language,
    detected_dialect: pm.dialect,
    content_en: pm.content_en,
    sentiment: pm.sentiment,
    buying_signals: pm.buying_signals ?? [],
    objections: pm.objections ?? [],
    close_stage: pm.close_stage,
    intent_tags: pm.intent_tags ?? [],
    analyzed_at: new Date().toISOString(),
  };
  const res = await fetch(`${url}/rest/v1/chat_messages?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`patchMessage failed: ${res.status} ${await res.text()}`);
  }
}

async function patchSession(sessionId: string, summary: SessionSummary, messageCount: number): Promise<void> {
  const url = required("SUPABASE_URL");
  const body = {
    primary_language: summary.primary_language,
    primary_dialect: summary.primary_dialect,
    final_stage: summary.final_stage,
    outcome: summary.outcome,
    close_quality_score: summary.close_quality_score,
    buying_signal_count: summary.buying_signal_count,
    objection_count: summary.objection_count,
    message_count: messageCount,
    session_analyzed_at: new Date().toISOString(),
  };
  const res = await fetch(`${url}/rest/v1/chat_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`patchSession failed: ${res.status} ${await res.text()}`);
  }
}

export async function runSessionAnalysis(sessionId: string): Promise<SessionAnalysisResult> {
  if (!sessionId) return { ok: false, session_id: "", message_count: 0, analyzed: 0, error: "sessionId required" };

  const messages = await fetchMessages(sessionId);
  if (messages.length === 0) {
    return { ok: false, session_id: sessionId, message_count: 0, analyzed: 0, error: "no messages" };
  }

  const transcript = buildTranscript(messages);
  const analysis = await callClaude(transcript);
  if (!analysis) {
    throw new Error("Claude returned unparseable JSON");
  }

  const byIdx = new Map<number, PerMessage>();
  for (const pm of analysis.messages) {
    if (typeof pm?.idx === "number") byIdx.set(pm.idx, pm);
  }

  let analyzed = 0;
  for (let i = 0; i < messages.length; i++) {
    const pm = byIdx.get(i + 1);
    if (!pm) continue;
    try {
      await patchMessage(messages[i], pm);
      analyzed++;
    } catch (e) {
      // continue with the rest, session level fields still get written below
      console.error("[analyze-session] patch message failed", messages[i].id, e);
    }
  }

  await patchSession(sessionId, analysis.session, messages.length);

  return { ok: true, session_id: sessionId, message_count: messages.length, analyzed };
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
    const body = (await req.json().catch(() => null)) as { sessionId?: string } | null;
    const sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== "string") {
      return Response.json({ ok: false, error: "sessionId required" }, { status: 400 });
    }
    const result = await runSessionAnalysis(sessionId);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
