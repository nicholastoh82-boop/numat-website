// lib/cron/reports/nara-learning.ts
//
// NARA Weekly Learning Loop: fetches last-7-days sessions + messages, packages
// language/objection/signal stats plus win/loss transcript excerpts, sends to
// Claude Sonnet for insight extraction (5 to 12 insights), writes insights to
// nara_training_insights with status='pending_review', and emails Nic a digest.

import { required, sendGmail, supabaseGet, supabasePost } from "@/lib/cron/helpers";
import { anthropicMessagesUrl, anthropicHeaders } from "@/lib/anthropic";

type NaraSession = {
  session_id: string;
  started_at: string;
  outcome: string | null;
  message_count: number | null;
  quality_score: number | null;
  primary_language: string | null;
  primary_dialect: string | null;
  final_stage: string | null;
};

type ChatMessage = {
  session_id: string;
  role: string;
  content: string | null;
  content_en: string | null;
  detected_language: string | null;
  detected_dialect: string | null;
  sentiment: string | null;
  buying_signals: string[] | null;
  objections: string[] | null;
  close_stage: string | null;
  intent_tags: string[] | null;
  created_at: string;
};

type Insight = {
  insight_type: string;
  insight_title: string;
  insight_description: string;
  example_quote?: string | null;
  language?: string | null;
  dialect?: string | null;
  sessions_observed?: number;
  conversion_correlation?: number | null;
  suggested_kb_entry_question?: string | null;
  suggested_kb_entry_answer?: string | null;
};

type ClaudeResponse = { content?: Array<{ text?: string }> };

const SYSTEM_PROMPT = `You analyze a week of NARA chatbot conversations for NUMAT bamboo products. Extract actionable insights that can be added to NARA's internal knowledge base to improve future conversations. Return STRICT JSON only, no prose, no markdown fences. Schema: {"insights": [ {"insight_type": one of [winning_pattern, losing_pattern, common_objection, common_question, cultural_cue, closing_tactic, buying_signal, language_gap], "insight_title": short title under 80 chars, "insight_description": 2 to 4 sentences explaining the pattern, "example_quote": a direct quote from the transcripts in English, "language": ISO code or null, "dialect": dialect name or null, "sessions_observed": integer, "conversion_correlation": number between -1 and 1 where 1 is strongly associated with wins and -1 strongly associated with losses, "suggested_kb_entry_question": a question-style title for a new KB entry to add, or null if not applicable, "suggested_kb_entry_answer": full answer text for a new KB entry, paragraph form, 100 to 400 words, or null if not applicable } ] }. Generate between 5 and 12 insights. Prefer specific over generic. Quote actual user language where possible. If a language or dialect appeared with low conversion, flag a language_gap insight. If objections repeat, write a common_objection with a specific rebuttal suggestion. No hyphens or dashes in any output text, use commas or colons instead.`;

function typeIcon(t: string): string {
  const map: Record<string, string> = {
    winning_pattern: "✓",
    losing_pattern: "✗",
    common_objection: "⚠",
    common_question: "?",
    cultural_cue: "🌏",
    closing_tactic: "→",
    buying_signal: "!",
    language_gap: "🌐",
  };
  return map[t] || "•";
}

function fmtNum(n: number | null | undefined, d = 1): string {
  return Number(n ?? 0).toFixed(d);
}

export async function runNaraWeeklyLearning() {
  const weekAgoISO = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [sessions, messages] = await Promise.all([
    supabaseGet<NaraSession[]>("nara_session_rollup", {
      select: "*",
      started_at: `gte.${weekAgoISO}`,
      order: "started_at.desc",
    }),
    supabaseGet<ChatMessage[]>("chat_messages", {
      select: "session_id,role,content,content_en,detected_language,detected_dialect,sentiment,buying_signals,objections,close_stage,intent_tags,created_at",
      created_at: `gte.${weekAgoISO}`,
      order: "session_id.asc,created_at.asc",
    }),
  ]);

  if (sessions.length === 0) {
    return { report: "nara_learning", sessions: 0, insights: 0, skipped: "no_sessions_in_window" };
  }

  // Group messages by session
  const msgsBySession: Record<string, ChatMessage[]> = {};
  for (const m of messages) {
    if (!msgsBySession[m.session_id]) msgsBySession[m.session_id] = [];
    msgsBySession[m.session_id].push(m);
  }

  // Classify sessions
  const won = sessions.filter((s) => s.outcome === "lead_captured" || s.outcome === "booking_requested");
  const lost = sessions.filter((s) => s.outcome === "abandoned" || s.outcome === "info_only");

  function transcriptExcerpt(sessionId: string, maxMsgs = 12): string {
    const msgs = msgsBySession[sessionId] || [];
    return msgs
      .slice(0, maxMsgs)
      .map(
        (m) =>
          `[${m.role}${m.detected_language && m.detected_language !== "en" ? " " + m.detected_language : ""}] ${(m.content_en || m.content || "").slice(0, 300)}`
      )
      .join("\n");
  }

  const wonTranscripts = won
    .slice()
    .sort((a, b) => (b.message_count ?? 0) - (a.message_count ?? 0))
    .slice(0, 5)
    .map((s) => ({
      session_id: s.session_id,
      quality: s.quality_score,
      language: s.primary_language,
      dialect: s.primary_dialect,
      transcript: transcriptExcerpt(s.session_id),
    }));
  const lostTranscripts = lost
    .slice()
    .sort((a, b) => (b.message_count ?? 0) - (a.message_count ?? 0))
    .slice(0, 5)
    .map((s) => ({
      session_id: s.session_id,
      language: s.primary_language,
      dialect: s.primary_dialect,
      final_stage: s.final_stage,
      transcript: transcriptExcerpt(s.session_id),
    }));

  // Language breakdown
  const byLang: Record<string, { total: number; won: number }> = {};
  for (const s of sessions) {
    const lang = s.primary_language || "unknown";
    if (!byLang[lang]) byLang[lang] = { total: 0, won: 0 };
    byLang[lang].total++;
    if (s.outcome === "lead_captured" || s.outcome === "booking_requested") byLang[lang].won++;
  }

  // Objection and signal frequencies
  const objectionCounts: Record<string, number> = {};
  for (const m of messages) for (const o of m.objections ?? []) objectionCounts[o] = (objectionCounts[o] || 0) + 1;
  const topObjections = Object.entries(objectionCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const signalCounts: Record<string, number> = {};
  for (const m of messages) for (const s of m.buying_signals ?? []) signalCounts[s] = (signalCounts[s] || 0) + 1;
  const topSignals = Object.entries(signalCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const pkg = {
    period: "Last 7 days",
    sessions_total: sessions.length,
    sessions_won: won.length,
    sessions_lost: lost.length,
    conversion_rate: sessions.length > 0 ? ((won.length / sessions.length) * 100).toFixed(1) + "%" : "n/a",
    language_breakdown: byLang,
    top_objections: topObjections,
    top_buying_signals: topSignals,
    winning_transcripts: wonTranscripts,
    losing_transcripts: lostTranscripts,
  };

  // Call Claude for insights
  const claudeResponse = await fetch(anthropicMessagesUrl(), {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(pkg, null, 2) }],
    }),
  });

  if (!claudeResponse.ok) {
    throw new Error(`Claude API failed: ${claudeResponse.status} ${await claudeResponse.text()}`);
  }
  const claudeData = (await claudeResponse.json()) as ClaudeResponse;

  // Parse insights
  let insights: Insight[] = [];
  try {
    const raw = claudeData.content?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as { insights?: Insight[] };
    insights = parsed.insights ?? [];
  } catch {
    insights = [];
  }

  // Prepare inserts
  const inserts = insights.map((i) => ({
    insight_type: i.insight_type,
    insight_title: i.insight_title,
    insight_description: i.insight_description,
    example_quote: i.example_quote || null,
    language: i.language || null,
    dialect: i.dialect || null,
    sessions_observed: i.sessions_observed || 1,
    conversion_correlation: i.conversion_correlation ?? null,
    suggested_kb_entry_question: i.suggested_kb_entry_question || null,
    suggested_kb_entry_answer: i.suggested_kb_entry_answer || null,
    status: "pending_review",
  }));

  if (inserts.length > 0) {
    await supabasePost("nara_training_insights", inserts);
  }

  // Build digest HTML
  const langRows = Object.entries(pkg.language_breakdown)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${v.total}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${v.won}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:${v.total > 0 && v.won / v.total >= 0.3 ? "#047857" : "#b45309"};">${v.total > 0 ? fmtNum((v.won / v.total) * 100, 1) + "%" : "-"}</td></tr>`
    )
    .join("");

  const objRows = pkg.top_objections.map(([k, v]) => `<tr><td style="padding:6px 12px;">${k}</td><td style="padding:6px 12px;text-align:right;">${v}</td></tr>`).join("");
  const sigRows = pkg.top_buying_signals.map(([k, v]) => `<tr><td style="padding:6px 12px;">${k}</td><td style="padding:6px 12px;text-align:right;">${v}</td></tr>`).join("");

  const insightCards = insights
    .map((i) => {
      const corr = i.conversion_correlation ?? 0;
      const correlationColor = corr > 0.3 ? "#047857" : corr < -0.3 ? "#b91c1c" : "#6b7280";
      const correlationLabel = corr > 0.3 ? "Winning pattern" : corr < -0.3 ? "Losing pattern" : "Neutral";
      return `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div><span style="font-size:18px;margin-right:6px;">${typeIcon(i.insight_type)}</span><strong style="font-size:14px;">${i.insight_title}</strong></div>
        <div style="font-size:11px;color:#6b7280;">${i.insight_type} · ${i.language || "multi"} · ${i.sessions_observed ?? 1} session(s)</div>
      </div>
      <div style="font-size:13px;color:#0f1f14;margin-bottom:10px;">${i.insight_description}</div>
      ${i.example_quote ? `<div style="font-size:12px;color:#6b7280;border-left:3px solid #e5e7eb;padding-left:10px;margin-bottom:10px;font-style:italic;">&quot;${i.example_quote}&quot;</div>` : ""}
      ${
        i.suggested_kb_entry_question
          ? `
        <div style="background:#f8faf8;padding:10px;border-radius:4px;font-size:12px;">
          <div style="font-weight:700;color:#2F5D3A;margin-bottom:4px;">Suggested KB entry:</div>
          <div style="font-weight:600;margin-bottom:4px;">${i.suggested_kb_entry_question}</div>
          <div style="color:#374151;">${(i.suggested_kb_entry_answer || "").slice(0, 400)}${(i.suggested_kb_entry_answer || "").length > 400 ? "..." : ""}</div>
        </div>`
          : ""
      }
      <div style="margin-top:10px;font-size:11px;color:${correlationColor};">Correlation with conversion: ${correlationLabel} (${fmtNum(corr, 2)})</div>
    </div>`;
    })
    .join("");

  const today = new Date().toISOString().slice(0, 10);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>NARA Weekly Learning Digest</title></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f1f14;line-height:1.5;">
<div style="max-width:780px;margin:0 auto;padding:32px 24px;background:#fff;">

<div style="border-bottom:2px solid #2F5D3A;padding-bottom:16px;margin-bottom:24px;">
  <div style="font-size:11px;font-weight:700;color:#2F5D3A;letter-spacing:0.12em;text-transform:uppercase;">NARA Learning Loop</div>
  <h1 style="font-size:24px;font-weight:700;margin:6px 0 4px 0;">Weekly Learning Digest</h1>
  <div style="font-size:14px;color:#6b7280;">Week ending ${today} · ${pkg.sessions_total} session${pkg.sessions_total !== 1 ? "s" : ""} · ${insights.length} insight${insights.length !== 1 ? "s" : ""} for review</div>
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Sessions</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;">${pkg.sessions_total}</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Leads captured</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;color:#047857;">${pkg.sessions_won}</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Conversion rate</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;">${pkg.conversion_rate}</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Insights</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;">${insights.length}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">pending review</div>
  </div>
</div>

<h2 style="font-size:16px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:24px 0 12px;">Language breakdown</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
  <thead><tr style="background:#f8faf8;">
    <th style="text-align:left;padding:8px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Language</th>
    <th style="text-align:right;padding:8px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Sessions</th>
    <th style="text-align:right;padding:8px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Leads</th>
    <th style="text-align:right;padding:8px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Conv rate</th>
  </tr></thead>
  <tbody>${langRows || '<tr><td colspan="4" style="padding:14px;text-align:center;color:#9ca3af;">No data</td></tr>'}</tbody>
</table>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
  <div>
    <h3 style="font-size:14px;font-weight:700;color:#2F5D3A;margin:0 0 8px;">Top buying signals</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e5e7eb;border-radius:6px;">
      <tbody>${sigRows || '<tr><td style="padding:8px;color:#9ca3af;">None detected</td></tr>'}</tbody>
    </table>
  </div>
  <div>
    <h3 style="font-size:14px;font-weight:700;color:#b45309;margin:0 0 8px;">Top objections</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e5e7eb;border-radius:6px;">
      <tbody>${objRows || '<tr><td style="padding:8px;color:#9ca3af;">None detected</td></tr>'}</tbody>
    </table>
  </div>
</div>

<h2 style="font-size:16px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:24px 0 12px;">Insights for review</h2>
<p style="font-size:13px;color:#6b7280;margin:0 0 16px;">Each card below is an insight Claude extracted from this week's conversations. To approve a suggested KB entry, update nara_training_insights.status from pending_review to approved. Approved insights will be auto-inserted into nara_knowledge on the next daily run.</p>

${insightCards || '<div style="padding:20px;text-align:center;color:#9ca3af;border:1px dashed #e5e7eb;border-radius:8px;">No insights generated this week</div>'}

<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
Source: nara_session_rollup view (last 7 days) + chat_messages analyzed data. Insights stored in nara_training_insights with status pending_review. Review in Supabase and set status to approved or rejected. Approved insights auto-insert into nara_knowledge on next daily-reports run.
</div>

</div></body></html>`;

  await sendGmail({
    from: "Nick",
    to: "nick@numat.ph",
    subject: `NARA Weekly Learning Digest: ${insights.length} insights from ${pkg.sessions_total} sessions (${pkg.conversion_rate} conversion)`,
    html,
  });

  return {
    report: "nara_learning",
    sessions: pkg.sessions_total,
    won: pkg.sessions_won,
    insights: insights.length,
    inserted: inserts.length,
  };
}