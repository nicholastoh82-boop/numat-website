// app/api/cron/reply-handler/route.ts
//
// Reply Handler (polling). Replaces n8n numat_reply_handler_unified.
// Runs every 5 minutes via pg_cron. Polls Nick, Mohan, Bryan inboxes for
// messages received in the last 6 minutes (1 min buffer for clock skew),
// filters out auto-replies and internal @numat.ph senders, calls
// mark_reply_received(from_email, reply_text, reply_subject) RPC, and emails
// Nick a notification for each valid human reply.
//
// Requires each rep's OAuth refresh token to include gmail.modify scope.
// (Just gmail.send — the original scope — is insufficient to read mailboxes.)

import {
  ALL_REPS,
  authorized,
  gmailListInboxSince,
  gmailMarkRead,
  sendGmail,
  supabaseRpc,
  type GmailMessageSummary,
  type RepKey,
} from "@/lib/cron/helpers";

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
  // Strip quoted replies: "On ... wrote:" and lines starting with ">"
  let clean = body.split(/\n\s*On .+ wrote:/)[0];
  clean = clean.split(/\n>{1,}/)[0];
  return clean.trim().substring(0, 2000);
}

function isHumanReply(msg: GmailMessageSummary): boolean {
  const fromRaw = msg.from || "";
  const email = extractEmail(fromRaw);

  if (!email || !email.includes("@")) return false;
  if (email.includes("mail-noreply@") || email.includes("googlemail.com")) return false;
  // Skip own team (outbound threads coming back to the inbox)
  if (email.endsWith("@numat.ph")) return false;

  const combined = `${msg.subject} ${fromRaw} ${msg.snippet} ${msg.body}`;
  if (AUTO_REPLY_REGEX.test(combined)) return false;

  return true;
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
}): string {
  const { fromName, fromEmail, subject, replyBody, matched, company, repAssigned, campaignId } = args;
  const headlineText = matched ? "Matched to an active campaign lead" : "Did not match any lead in master_leads";
  const safeBody = (replyBody || "").replace(/</g, "&lt;").slice(0, 1500);

  return `<div style="font-family:DM Sans,Arial,sans-serif;max-width:640px;padding:24px;background:#ffffff;color:#0B0D0E;">
    <h2 style="font-family:'DM Serif Display',Georgia,serif;margin:0 0 8px;font-size:22px;color:#1D9E75;">Reply received</h2>
    <p style="color:#6B7280;margin:0 0 20px;font-size:13px;">${headlineText}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#6B7280;width:120px;">From</td><td style="padding:6px 0;font-weight:600;">${fromName} &lt;${fromEmail}&gt;</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Company</td><td style="padding:6px 0;font-weight:600;">${company}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Assigned rep</td><td style="padding:6px 0;font-weight:600;">${repAssigned}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Campaign</td><td style="padding:6px 0;font-weight:600;">${campaignId}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;">Subject</td><td style="padding:6px 0;">${subject}</td></tr>
    </table>
    <div style="background:#F5F7F6;border-radius:8px;padding:16px;font-size:13px;line-height:1.6;color:#1F2937;white-space:pre-wrap;border-left:3px solid #1D9E75;">${safeBody}</div>
    <p style="margin:20px 0 0;color:#6B7280;font-size:12px;">Status auto-updated in Supabase. Remaining sequence steps for this lead have been skipped.</p>
  </div>`;
}

async function processRep(rep: RepKey): Promise<{ rep: RepKey; scanned: number; processed: number; matched: number; error?: string }> {
  let messages: GmailMessageSummary[];
  try {
    messages = await gmailListInboxSince(rep, POLL_WINDOW_MINUTES, 50);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`poll ${rep} failed:`, errMsg);
    return { rep, scanned: 0, processed: 0, matched: 0, error: errMsg };
  }

  let processed = 0;
  let matched = 0;

  for (const msg of messages) {
    if (!isHumanReply(msg)) continue;

    const fromRaw = msg.from || "";
    const fromEmail = extractEmail(fromRaw);
    const fromName = extractName(fromRaw) || fromEmail;
    const replyBody = cleanBody(msg.body || msg.snippet);

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
    const company = rpcResult?.company || "unknown";
    const repAssigned = rpcResult?.rep_assigned || "unknown";
    const campaignId = rpcResult?.campaign_id || "unknown";

    const notificationSubject = wasMatched
      ? `Reply from ${fromName} at ${company} (to ${repAssigned})`
      : `Unmatched reply from ${fromEmail}`;
    const html = buildNotificationHtml({
      fromName,
      fromEmail,
      subject: msg.subject,
      replyBody,
      matched: wasMatched,
      company,
      repAssigned,
      campaignId,
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

    // Mark the original inbox message as read so it does not reappear on the
    // next poll (and so the rep sees "the automation has seen this").
    await gmailMarkRead(rep, msg.id);

    processed++;
    if (wasMatched) matched++;
  }

  return { rep, scanned: messages.length, processed, matched };
}

async function handle(): Promise<Response> {
  const started = Date.now();
  try {
    const results = await Promise.all(ALL_REPS.map(processRep));
    const total_scanned = results.reduce((a, r) => a + r.scanned, 0);
    const total_processed = results.reduce((a, r) => a + r.processed, 0);
    const total_matched = results.reduce((a, r) => a + r.matched, 0);
    return Response.json({
      ok: true,
      total_scanned,
      total_processed,
      total_matched,
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