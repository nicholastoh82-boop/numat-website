// app/api/cron/nara-analyzer/route.ts
//
// Replacement for n8n workflow `NARA — Message Analyzer`.
// Triggered by Supabase pg_cron every minute via pg_net POST.
//
// Flow:
//   1. Verify Authorization: Bearer <CRON_SECRET>
//   2. Fetch up to 5 unanalyzed chat_messages (analyzed_at IS NULL, excluding auto-open markers)
//   3. For each (in parallel): call Claude Haiku 4.5 to analyze language/sentiment/buying signals/close stage/intent
//   4. PATCH chat_messages with the parsed analysis + analyzed_at
//   5. If user message in a non-English language, insert a row into nara_translations

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 5;

const SYSTEM_PROMPT = `You analyze a single chat message from a NUMAT website visitor to the NARA assistant. Return STRICT JSON only, no prose, no markdown, no code fences. Schema: {"language": ISO code like en, tl, ceb, ms, id, zh-CN, zh-HK, ja, ko, th, vi, es, fr, de, ar; "dialect": local dialect name or null like Bisaya, Ilocano, Singlish, Hokkien, Cantonese, or null; "content_en": English translation of the message verbatim, or the original if already English; "sentiment": one of positive neutral negative hostile excited hesitant ready; "buying_signals": array of short tags like ["asked_timeline", "asked_price", "mentioned_quantity", "asked_to_order", "requested_quote", "asked_delivery", "asked_warranty", "compared_skus", "mentioned_project_scale", "ready_to_buy"]; "objections": array of short tags like ["price_too_high", "need_more_time", "comparing_alternatives", "budget_concern", "quality_doubt", "lead_time_concern"]; "close_stage": one of discovery interest consideration objection decision ready_to_close closed_won closed_lost; "intent_tags": array of short tags like ["hotel_project", "resort_project", "residential", "commercial_fitout", "distributorship", "container_order", "small_order", "bulk_order", "site_visit", "sample_request"]}. For assistant messages, set sentiment neutral and all arrays empty and close_stage as the stage the assistant is in. For user messages, infer everything from the message content.`;

type ChatMessage = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

type Analysis = {
  language: string;
  dialect: string | null;
  content_en: string;
  sentiment: string;
  buying_signals: string[];
  objections: string[];
  close_stage: string;
  intent_tags: string[];
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

async function fetchUnanalyzed(): Promise<ChatMessage[]> {
  const url = required("SUPABASE_URL");
  const params = new URLSearchParams({
    select: "id,session_id,role,content,created_at",
    analyzed_at: "is.null",
    content: "not.eq.[VE Report auto-open]",
    order: "created_at.asc",
    limit: String(BATCH_SIZE),
  });
  const res = await fetch(`${url}/rest/v1/chat_messages?${params.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fetchUnanalyzed failed: ${res.status} ${body}`);
  }
  return (await res.json()) as ChatMessage[];
}

function fallbackAnalysis(msg: ChatMessage): Analysis {
  return {
    language: "en",
    dialect: null,
    content_en: msg.content,
    sentiment: "neutral",
    buying_signals: [],
    objections: [],
    close_stage: "discovery",
    intent_tags: [],
  };
}

async function analyzeWithClaude(msg: ChatMessage): Promise<Analysis> {
  const apiKey = required("ANTHROPIC_API_KEY");
  const userContent = `Role: ${msg.role}\nMessage: ${msg.content}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const raw = json.content?.[0]?.text ?? "";
  // Strip accidental code fences if model ignores instruction
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<Analysis>;
    return {
      language: parsed.language || "en",
      dialect: parsed.dialect ?? null,
      content_en: parsed.content_en || msg.content,
      sentiment: parsed.sentiment || "neutral",
      buying_signals: parsed.buying_signals ?? [],
      objections: parsed.objections ?? [],
      close_stage: parsed.close_stage || "discovery",
      intent_tags: parsed.intent_tags ?? [],
    };
  } catch {
    return fallbackAnalysis(msg);
  }
}

async function updateChatMessage(msg: ChatMessage, analysis: Analysis): Promise<void> {
  const url = required("SUPABASE_URL");
  const body = {
    detected_language: analysis.language,
    detected_dialect: analysis.dialect,
    content_en: analysis.content_en,
    sentiment: analysis.sentiment,
    buying_signals: analysis.buying_signals,
    objections: analysis.objections,
    close_stage: analysis.close_stage,
    intent_tags: analysis.intent_tags,
    analyzed_at: new Date().toISOString(),
  };
  const res = await fetch(`${url}/rest/v1/chat_messages?id=eq.${encodeURIComponent(msg.id)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH chat_messages failed: ${res.status} ${text}`);
  }
}

async function logTranslation(msg: ChatMessage, analysis: Analysis): Promise<void> {
  const url = required("SUPABASE_URL");
  const body = {
    original_text: msg.content,
    original_language: analysis.language,
    original_dialect: analysis.dialect,
    translated_text: analysis.content_en,
    target_language: "en",
    context: "chat_message",
    source_table: "chat_messages",
    source_row_id: msg.id,
  };
  const res = await fetch(`${url}/rest/v1/nara_translations`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT nara_translations failed: ${res.status} ${text}`);
  }
}

async function processOne(msg: ChatMessage): Promise<{ id: string; translated: boolean }> {
  const analysis = await analyzeWithClaude(msg);
  await updateChatMessage(msg, analysis);
  const needsTranslation = analysis.language !== "en" && msg.role === "user";
  if (needsTranslation) {
    await logTranslation(msg, analysis);
  }
  return { id: msg.id, translated: needsTranslation };
}

async function handle(): Promise<Response> {
  const started = Date.now();
  const messages = await fetchUnanalyzed();

  if (messages.length === 0) {
    return Response.json({ ok: true, fetched: 0, analyzed: 0, translated: 0, failed: 0, ms: Date.now() - started });
  }

  // Run in parallel; isolate failures per message
  const results = await Promise.allSettled(messages.map(processOne));

  let analyzed = 0;
  let translated = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      analyzed++;
      if (r.value.translated) translated++;
    } else {
      failed++;
      const err = r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push({ id: messages[i].id, error: err });
    }
  }

  return Response.json({
    ok: true,
    fetched: messages.length,
    analyzed,
    translated,
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