// app/api/cron/scan-rep-outreach/route.ts
//
// Scans Mohan and Eugene Gmail accounts (rep_email accounts) for two things:
//
//   1. SENT detection. The rep sends cold outreach manually from their own
//      Gmail compose window (copy paste from the docx pack we generated).
//      That means our cron never gets a chance to log the send. We detect
//      it after the fact by listing their Sent folder and matching by
//      recipient email against email_drafts rows for that rep. When matched
//      and not already linked, we mark the draft as sent_by_rep, store the
//      Gmail message + thread IDs, log a 'sent' event to sequence_events,
//      and update master_leads activity timestamps.
//
//   2. REPLY detection. For every email_drafts row that now has a thread ID,
//      we re-fetch the thread and look for any message in it that did not
//      come from the rep. Any such message is treated as a reply from the
//      lead. We store the reply snippet, log a 'replied' event to
//      sequence_events, update master_leads.replied_at + reply_text, and
//      insert a personal_tasks row so Nick gets a Telegram nudge.
//
// Idempotency:
//   - Sent detection only fires when gmail_message_id is null on the draft.
//   - Reply detection only fires when reply_detected_at is null on the draft.
//   - sequence_events uses a (email, sequence_name, sequence_step,
//     format_version) implicit dedupe; we add a stable format_version
//     suffix per detection type so re-runs are safe.
//
// Schedule:
//   vercel.json runs this hourly. The detection window is 48 hours which
//   gives plenty of buffer for retries and overnight runs.

import { NextResponse } from "next/server";
import {
  ALL_REPS,
  authorized,
  gmailGetThreadMessages,
  gmailListSentSince,
  parseEmailAddress,
  RepKey,
  repEmailFor,
  required,
  supabaseGetRaw,
  supabasePatch,
  supabasePost,
} from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCAN_WINDOW_MINUTES = 48 * 60; // 48 hours
const SEQUENCE_NAME = "cold_outreach_v1";
const FORMAT_VERSION_SENT = "2026-05-21-rep-sent-scanner";
const FORMAT_VERSION_REPLIED = "2026-05-21-rep-reply-scanner";

// Only scan reps that actually send outreach manually from Gmail.
const SCAN_REPS: RepKey[] = ["Mohan", "Eugene"];

type DraftRow = {
  id: string;
  rep_email: string;
  recipient_email: string;
  company: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  gmail_message_id: string | null;
  gmail_thread_id: string | null;
  sent_detected_at: string | null;
  reply_detected_at: string | null;
  lead_id: string | null;
  generated_at: string;
};

type RepResult = {
  rep: string;
  scanned_sent: number;
  newly_linked: number;
  threads_checked: number;
  new_replies: number;
  error?: string;
};

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    required("SUPABASE_SERVICE_ROLE_KEY");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const results: RepResult[] = [];
  for (const rep of SCAN_REPS) {
    try {
      results.push(await scanRep(rep));
    } catch (e) {
      results.push({
        rep: repEmailFor(rep),
        scanned_sent: 0,
        newly_linked: 0,
        threads_checked: 0,
        new_replies: 0,
        error: (e as Error).message,
      });
    }
  }

  const summary = results.reduce(
    (acc, r) => ({
      scanned_sent: acc.scanned_sent + r.scanned_sent,
      newly_linked: acc.newly_linked + r.newly_linked,
      threads_checked: acc.threads_checked + r.threads_checked,
      new_replies: acc.new_replies + r.new_replies,
    }),
    { scanned_sent: 0, newly_linked: 0, threads_checked: 0, new_replies: 0 },
  );

  return NextResponse.json({
    ok: true,
    window_minutes: SCAN_WINDOW_MINUTES,
    rep_results: results,
    summary,
  });
}

async function scanRep(rep: RepKey): Promise<RepResult> {
  const repEmail = repEmailFor(rep);

  // Phase 1: SENT detection. Pull recent sent messages and match against
  // any email_drafts row for this rep that has no gmail_message_id yet.
  const sent = await gmailListSentSince(rep, SCAN_WINDOW_MINUTES, 100);
  const candidateDrafts = await supabaseGetRaw<DraftRow[]>(
    `email_drafts?select=id,rep_email,recipient_email,company,subject,body,status,gmail_message_id,gmail_thread_id,sent_detected_at,reply_detected_at,lead_id,generated_at&rep_email=eq.${encodeURIComponent(
      repEmail,
    )}&gmail_message_id=is.null&order=generated_at.desc&limit=500`,
  );
  // Index drafts by recipient_email (lowercased) for fast lookup. A rep may
  // have multiple drafts to the same person across days, in which case we
  // pick the newest unsent one.
  const byRecipient = new Map<string, DraftRow[]>();
  for (const d of candidateDrafts) {
    const key = d.recipient_email.toLowerCase();
    const arr = byRecipient.get(key) ?? [];
    arr.push(d);
    byRecipient.set(key, arr);
  }

  let newlyLinked = 0;
  for (const msg of sent) {
    const toHeader = msg.to || "";
    // A sent message may have multiple recipients; check each.
    const recipients = toHeader
      .split(",")
      .map((s) => parseEmailAddress(s))
      .filter((s) => s.length > 0);
    if (recipients.length === 0) continue;
    let matchedDraft: DraftRow | null = null;
    let matchedRecipient: string | null = null;
    for (const r of recipients) {
      const drafts = byRecipient.get(r);
      if (drafts && drafts.length > 0) {
        // Pick the newest unlinked draft.
        const sorted = drafts.sort(
          (a, b) =>
            new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
        );
        matchedDraft = sorted[0];
        matchedRecipient = r;
        break;
      }
    }
    if (!matchedDraft || !matchedRecipient) continue;

    await linkSentDraft(matchedDraft, msg.id, msg.threadId, repEmail);
    newlyLinked++;
    // Remove from index so the same Gmail message does not match a second
    // draft on this run.
    const drafts = byRecipient.get(matchedRecipient);
    if (drafts) {
      byRecipient.set(
        matchedRecipient,
        drafts.filter((d) => d.id !== matchedDraft!.id),
      );
    }
  }

  // Phase 2: REPLY detection. Walk every email_drafts row for this rep that
  // has a thread ID but no reply yet, and re-check the thread.
  const trackedDrafts = await supabaseGetRaw<DraftRow[]>(
    `email_drafts?select=id,rep_email,recipient_email,company,subject,body,status,gmail_message_id,gmail_thread_id,sent_detected_at,reply_detected_at,lead_id,generated_at&rep_email=eq.${encodeURIComponent(
      repEmail,
    )}&gmail_thread_id=not.is.null&reply_detected_at=is.null&limit=500`,
  );

  let newReplies = 0;
  for (const d of trackedDrafts) {
    const threadId = d.gmail_thread_id!;
    const messages = await gmailGetThreadMessages(rep, threadId);
    if (messages.length === 0) continue;
    // Find the first message in the thread that did NOT come from the rep.
    // Gmail returns thread messages in chronological order.
    const reply = messages.find((m) => {
      const fromEmail = parseEmailAddress(m.from);
      return fromEmail && fromEmail !== repEmail.toLowerCase();
    });
    if (!reply) continue;
    await markReplyDetected(d, reply, repEmail);
    newReplies++;
  }

  return {
    rep: repEmail,
    scanned_sent: sent.length,
    newly_linked: newlyLinked,
    threads_checked: trackedDrafts.length,
    new_replies: newReplies,
  };
}

// Re-export ALL_REPS reference to satisfy lint when extending scan set later.
void ALL_REPS;

async function linkSentDraft(
  draft: DraftRow,
  gmailMessageId: string,
  gmailThreadId: string,
  repEmail: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  await supabasePatch(
    `email_drafts?id=eq.${encodeURIComponent(draft.id)}`,
    {
      gmail_message_id: gmailMessageId,
      gmail_thread_id: gmailThreadId,
      sent_detected_at: nowIso,
      status: "sent_by_rep",
    },
  );
  await supabasePost("sequence_events", {
    email: draft.recipient_email,
    company: draft.company,
    sequence_name: SEQUENCE_NAME,
    sequence_step: 1,
    email_subject: draft.subject,
    format_version: FORMAT_VERSION_SENT,
    event_type: "sent",
    rooms: { rep_email: repEmail, draft_id: draft.id, gmail_thread_id: gmailThreadId },
  });
  if (draft.lead_id) {
    await supabasePatch(
      `master_leads?id=eq.${encodeURIComponent(draft.lead_id)}`,
      {
        email_1_sent: true,
        last_email_sent: nowIso,
        outreach_started_at: nowIso,
        last_activity_at: nowIso,
        last_activity_type: "email_sent",
        current_email_num: 1,
        last_rep_touch_at: nowIso,
        last_rep_touch_by: repEmail,
        last_rep_touch_subject: draft.subject,
      },
    );
  }
}

async function markReplyDetected(
  draft: DraftRow,
  reply: {
    id: string;
    threadId: string;
    from: string;
    subject: string;
    snippet: string;
    body: string;
    date: string;
  },
  repEmail: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const fromEmail = parseEmailAddress(reply.from);
  const snippet = (reply.body || reply.snippet || "").slice(0, 1000);

  await supabasePatch(
    `email_drafts?id=eq.${encodeURIComponent(draft.id)}`,
    {
      reply_detected_at: nowIso,
      reply_snippet: snippet,
      reply_from_email: fromEmail,
      status: "replied",
    },
  );

  await supabasePost("sequence_events", {
    email: draft.recipient_email,
    company: draft.company,
    sequence_name: SEQUENCE_NAME,
    sequence_step: 1,
    email_subject: draft.subject,
    format_version: FORMAT_VERSION_REPLIED,
    event_type: "replied",
    rooms: {
      rep_email: repEmail,
      draft_id: draft.id,
      gmail_thread_id: draft.gmail_thread_id,
      reply_from: fromEmail,
    },
  });

  if (draft.lead_id) {
    await supabasePatch(
      `master_leads?id=eq.${encodeURIComponent(draft.lead_id)}`,
      {
        replied_at: nowIso,
        reply_text: snippet,
        last_activity_at: nowIso,
        last_activity_type: "reply_received",
      },
    );
  }

  // Telegram nudge for Nick via the personal_tasks queue.
  try {
    await supabasePost("personal_tasks", {
      title: `Reply from ${draft.company ?? fromEmail}`,
      details:
        `${repEmail} got a reply from ${fromEmail} (lead: ${draft.company ?? "unknown"}).\n\n` +
        `Reply snippet:\n${snippet.slice(0, 600)}\n\n` +
        `Review at https://numatbamboo.com/crm/outreach?reply=${encodeURIComponent(draft.id)}`,
      status: "pending",
      source: "claude",
      priority: "high",
    });
  } catch (e) {
    console.error("personal_tasks insert (reply) failed:", e);
  }
}

// Suppress unused warnings for helpers we kept for future use.
void ALL_REPS;
