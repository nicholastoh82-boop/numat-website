// app/api/cron/reply-handler/route.ts
//
// Reply Handler (polling). Runs every 5 minutes via pg_cron. Polls Nick, Mohan,
// Bryan, Eugene inboxes for messages received in the last 6 minutes (1 min
// buffer for clock skew), filters out auto-replies and internal @numat.ph
// senders, then:
//   1. Classifies the reply with Gemini (hot_lead, soft_no, etc + priority P0..P3)
//   2. Calls mark_reply_received RPC to match the lead and update sequence_events
//   3. Patches master_leads with the classification fields (reply_classification,
//      reply_priority, reply_summary, reply_next_step, reply_suggested_action)
//   4. Emails Nick a notification including the classification banner
//   5. If priority is P0 or P1, sends a Telegram alert to the NUMAT Ops bot
//   6. Marks the original inbox message as read
//
// Requires each rep's OAuth refresh token to include gmail.modify scope.
// (Just gmail.send is insufficient to read mailboxes.)
//
// Env vars used (all pre-existing):
//   GEMINI_API_KEY (new), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CRON_SECRET

import {
  ALL_REPS,
  authorized,
  gmailListInboxSince,
  gmailMarkRead,
  sendGmail,
  supabasePatch,
  supabaseRpc,
  type GmailMessageSummary,
  type RepKey,
} from "@/lib/cron/helpers";
import {
  classifyReply,
  isHotLead,
  type ClassificationResult,
} from "@/lib/cron/classify_reply";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron fires every 5 minutes — poll last 6 minutes to bridge any skew.
const POLL_WINDOW_MINUTES = 6;

// Multi-language auto-reply detection — ported verbatim from n8n for parity.
const AUTO_REPLY_REGEX =
  /auto[- ]?(reply|response|antwoord|respuesta|r[eé]ponse)|out[- ]?of[- ]?office|vacation|mailer[- ]?daemon|postmaster|no[- ]?reply|noreply|do[- ]?not[- ]?reply|on leave|away from (my |the )?(office|desk)|currently (away|unavailable|out)|return to the office|back (in|on|to) the office|back at (my )?desk|limited access to (my )?email|not (available|present|in the office)|afwezig|niet aanwezig|estar[eé] fuera|estoy de vacaciones|je suis absent|ne suis pas disponible|au bureau le|abwesend|urlaub|休暇|不在|外出中|自動返信|休假|外出|自动回复/i;

type RpcResult = {
  matched?: boolean;
  lead_id?: string | null;
  company?: string | null;
  rep_assigned?: string | null;
  campaign_id?: string | null;
};

function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function extractName(raw: string): string {
  return raw.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
}

function cleanBody(body: string): string {
  let clean = body.split(/\n\s*On .+ wrote:/)[0];
  clean = clean.split(/\n>{1,}/)[0];
  return clean.trim().substring(0, 2000);
}

function isHumanReply(msg: GmailMessageSummary): boolean {
  const fromRaw = msg.from || "";
  const email = extractEmail(fromRaw);
  if (!email || !email.includes("@")) return false;
  if (email.includes("mail-noreply@") || email.includes("googlemail.com")) return false;
  if (email.endsWith("@numat.ph")) return false;
  const combined = `${msg.subject} ${fromRaw} ${msg.snippet} ${msg.body}`;
  if (AUTO_REPLY_REGEX.test(combined)) return false;
  return true;
}

function htmlEscape(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function priorityColour(priority: string): string {
  if (priority === "P0") return "#DC2626";
  if (priority === "P1") return "#EA580C";
  if (priority === "P2") return "#0369A1";
  return "#6B7280";
}

function buildNotificationHtml(args: {
  fromName: string;
  fromEmail: string;
  subject: string;
  replyBody: string;
  matched: boolean;
  company: string;
  repAssigned: string;
  campaignId: string;
  classification: ClassificationResult | null;
}): string {
  const {
    fromName,
    fromEmail,
    subject,
    replyBody,
    matched,
    company,
    repAssigned,
    campaignId,
    classification,
  } = args;
  const headlineText = matched
    ? "Matched to an active campaign lead"
    : "Did not match any lead in master_leads";
  const safeBody = (replyBody || "").replace(/</g, "&lt;").slice(0, 1500);

  const classBlock = classification
    ? `<div style="background:${priorityColour(
        classification.priority
      )};color:#ffffff;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${htmlEscape(
          classification.priority
        )} &middot; ${htmlEscape(classification.classification)}</div>
        <div style="margin-bottom:4px;"><strong>Summary:</strong> ${htmlEscape(
          classification.summary
        )}</div>
        <div style="margin-bottom:4px;"><strong>Next step:</strong> ${htmlEscape(
          classification.next_step
        )}</div>
        <div><strong>Suggested:</strong> ${htmlEscape(
          classification.suggested_action
        )}</div>
      </div>`
    : "";

  return `<div style="font-family:DM Sans,Arial,sans-serif;max-width:640px;padding:24px;background:#ffffff;color:#0B0D0E;">
    <h2 style="font-family:'DM Serif Display',Georgia,serif;margin:0 0 8px;font-size:22px;color:#1D9E75;">Reply received</h2>
    <p style="color:#6B7280;margin:0 0 20px;font-size:13px;">${headlineText}</p>
    ${classBlock}
    <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#6B7280;width:120px;">From</td><td style="padding:6px 0;font-weight:600;">${htmlEscape(fromName)} &lt;${htmlEscape(fromEmail)}&gt;</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Company</td><td style="padding:6px 0;font-weight:600;">${htmlEscape(company)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Assigned rep</td><td style="padding:6px 0;font-weight:600;">${htmlEscape(repAssigned)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Campaign</td><td style="padding:6px 0;font-weight:600;">${htmlEscape(campaignId)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Subject</td><td style="padding:6px 0;">${htmlEscape(subject)}</td></tr>
    </table>
    <div style="background:#F5F7F6;border-radius:8px;padding:16px;font-size:13px;line-height:1.6;color:#1F2937;white-space:pre-wrap;border-left:3px solid #1D9E75;">${safeBody}</div>
    <p style="margin:20px 0 0;color:#6B7280;font-size:12px;">Status auto-updated in Supabase. Remaining sequence steps for this lead have been skipped.</p>
  </div>`;
}

async function sendTelegramHotAlert(args: {
  fromName: string;
  fromEmail: string;
  company: string;
  repAssigned: string;
  classification: ClassificationResult;
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const lines = [
    `🔥 <b>Hot reply</b> (${args.classification.priority})`,
    `<b>From:</b> ${args.fromName} &lt;${args.fromEmail}&gt;`,
    `<b>Company:</b> ${args.company}`,
    `<b>Assigned:</b> ${args.repAssigned}`,
    `<b>Class:</b> ${args.classification.classification}`,
    `<b>Summary:</b> ${args.classification.summary}`,
    `<b>Next step:</b> ${args.classification.next_step}`,
    `<b>Action:</b> ${args.classification.suggested_action}`,
  ];

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("Telegram alert failed:", err);
  }
}

async function patchLeadClassification(
  leadId: string,
  c: ClassificationResult
): Promise<void> {
  try {
    await supabasePatch(`master_leads?id=eq.${leadId}`, {
      reply_classification: c.classification,
      reply_priority: c.priority,
      reply_summary: c.summary,
      reply_next_step: c.next_step,
      reply_suggested_action: c.suggested_action,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`patchLeadClassification failed for ${leadId}:`, err);
  }
}

async function processRep(
  rep: RepKey
): Promise<{
  rep: RepKey;
  scanned: number;
  processed: number;
  matched: number;
  hot: number;
  classify_errors: number;
  error?: string;
}> {
  let messages: GmailMessageSummary[];
  try {
    messages = await gmailListInboxSince(rep, POLL_WINDOW_MINUTES, 50);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`poll ${rep} failed:`, errMsg);
    return { rep, scanned: 0, processed: 0, matched: 0, hot: 0, classify_errors: 0, error: errMsg };
  }

  let processed = 0;
  let matched = 0;
  let hot = 0;
  let classify_errors = 0;

  for (const msg of messages) {
    if (!isHumanReply(msg)) continue;

    const fromRaw = msg.from || "";
    const fromEmail = extractEmail(fromRaw);
    const fromName = extractName(fromRaw) || fromEmail;
    const replyBody = cleanBody(msg.body || msg.snippet);

    // Step 1: classify with Gemini.
    let classification: ClassificationResult | null = null;
    try {
      classification = await classifyReply({
        fromName,
        fromEmail,
        subject: msg.subject,
        replyText: replyBody,
      });
    } catch (err) {
      classify_errors++;
      console.error(`classifyReply failed for ${fromEmail}:`, err);
    }

    // Step 2: call mark_reply_received RPC (unchanged behaviour).
    let rpcResult: RpcResult | null = null;
    try {
      const raw = await supabaseRpc<RpcResult | RpcResult[]>("mark_reply_received", {
        p_from_email: fromEmail,
        p_reply_text: replyBody,
        p_reply_subject: msg.subject.slice(0, 300),
      });
      rpcResult = Array.isArray(raw) ? raw[0] ?? null : raw;
    } catch (err) {
      console.error(`mark_reply_received failed for ${fromEmail}:`, err);
    }

    const wasMatched = rpcResult?.matched === true;
    const leadId = rpcResult?.lead_id || null;
    const company = rpcResult?.company || "unknown";
    const repAssigned = rpcResult?.rep_assigned || "unknown";
    const campaignId = rpcResult?.campaign_id || "unknown";

    // Step 3: persist classification on the matched lead.
    if (classification && wasMatched && leadId) {
      await patchLeadClassification(leadId, classification);
    }

    // Step 4: notification email to Nick.
    const priorityTag = classification ? `[${classification.priority}] ` : "";
    const notificationSubject = wasMatched
      ? `${priorityTag}Reply from ${fromName} at ${company} (to ${repAssigned})`
      : `${priorityTag}Unmatched reply from ${fromEmail}`;
    const html = buildNotificationHtml({
      fromName,
      fromEmail,
      subject: msg.subject,
      replyBody,
      matched: wasMatched,
      company,
      repAssigned,
      campaignId,
      classification,
    });

    try {
      await sendGmail({
        from: "Nick",
        to: "nick@numat.ph",
        subject: notificationSubject,
        html,
      });
    } catch (err) {
      console.error(`notification email failed for ${fromEmail}:`, err);
    }

    // Step 5: Telegram alert for hot leads only.
    if (classification && isHotLead(classification.priority)) {
      hot++;
      await sendTelegramHotAlert({
        fromName,
        fromEmail,
        company,
        repAssigned,
        classification,
      });
    }

    // Step 6: mark inbox message as read.
    await gmailMarkRead(rep, msg.id);

    processed++;
    if (wasMatched) matched++;
  }

  return { rep, scanned: messages.length, processed, matched, hot, classify_errors };
}

async function handle(): Promise<Response> {
  const started = Date.now();
  try {
    const results = await Promise.all(ALL_REPS.map(processRep));
    const total_scanned = results.reduce((a, r) => a + r.scanned, 0);
    const total_processed = results.reduce((a, r) => a + r.processed, 0);
    const total_matched = results.reduce((a, r) => a + r.matched, 0);
    const total_hot = results.reduce((a, r) => a + r.hot, 0);
    const total_classify_errors = results.reduce((a, r) => a + r.classify_errors, 0);
    return Response.json({
      ok: true,
      total_scanned,
      total_processed,
      total_matched,
      total_hot,
      total_classify_errors,
      per_rep: results,
      ms: Date.now() - started,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err), ms: Date.now() - started },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return handle();
}
