// app/api/cron/bounce-catcher/route.ts
//
// Bounce Catcher (polling). Replaces n8n numat_bounce_catcher.
// Runs every 5 minutes via pg_cron. Polls Nick, Mohan, Bryan inboxes for
// bounce notifications and out-of-office auto-replies, parses failed
// recipient where possible, categorises the bounce, and logs to
// log_system_reply RPC.
//
// Like reply-handler, this requires gmail.modify scope on the OAuth tokens.

import {
  ALL_REPS,
  authorized,
  gmailListInboxSince,
  gmailMarkRead,
  repEmailFor,
  supabaseRpc,
  type GmailMessageSummary,
  type RepKey,
} from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POLL_WINDOW_MINUTES = 6;

// Failed-recipient extraction patterns — ordered from most to least specific.
const FAILED_RECIPIENT_PATTERNS: RegExp[] = [
  /(?:delivered to|deliver(?:ed)? to these recipients(?: or groups)?:?|message to|Your message to|deliver your message to)\s*([\w.+-]+@[\w.-]+\.[a-z]{2,})/i,
  /([\w.+-]+@[\w.-]+\.[a-z]{2,})(?:\s+(?:wasn|couldn|was not|could not))/i,
  /address[^a-z]+not[^a-z]+found[^a-z]+([\w.+-]+@[\w.-]+\.[a-z]{2,})/i,
  /recipients?(?: or groups?)?:?\s*([\w.+-]+@[\w.-]+\.[a-z]{2,})/i,
];

const BOUNCE_SUBJECT_REGEX =
  /delivery status notification|undeliverable|undelivered|could not be delivered|failure notice|delivery has failed/i;

const OOO_REGEX =
  /out of office|automatic reply|auto reply|vacation|on leave|currently away|return to the office|afwezig|urlaub|休暇|自動返信/i;

type Classification = {
  is_bounce: boolean;
  is_ooo: boolean;
  category: string;
  failed_recipient: string | null;
};

function classify(msg: GmailMessageSummary): Classification | null {
  const from = (msg.from || "").toLowerCase();
  const subject = msg.subject || "";
  const snippet = msg.snippet || "";
  const body = msg.body || "";
  const combined = `${subject} ${snippet} ${body}`.toLowerCase();

  const isBounce =
    from.includes("mailer-daemon") ||
    from.includes("postmaster") ||
    BOUNCE_SUBJECT_REGEX.test(`${subject} ${snippet}`);
  const isOoo = OOO_REGEX.test(combined);

  if (!isBounce && !isOoo) return null;

  let failedRecipient: string | null = null;
  let category = "other";

  if (isBounce) {
    const searchText = `${body} ${snippet}`;
    for (const pattern of FAILED_RECIPIENT_PATTERNS) {
      const m = searchText.match(pattern);
      if (m) {
        failedRecipient = m[1].toLowerCase();
        break;
      }
    }
    if (/address not found|couldn'?t be found|recipient unknown|user unknown|no such (user|mailbox)|554 5\.1\.1/i.test(combined))
      category = "address_not_found";
    else if (/mailbox (is )?full|over quota|insufficient.{0,20}storage/i.test(combined)) category = "mailbox_full";
    else if (/remote server.{0,30}misconfigured|550 5\.7|relay.{0,20}denied/i.test(combined))
      category = "server_misconfigured";
    else if (/550\s+High|policy|blocked|blacklisted|reputation|spam/i.test(combined)) category = "policy_block";
    else if (/connection (refused|timed out|could not|failed)|repeated attempts/i.test(combined))
      category = "server_unreachable";
    else category = "hard_bounce";
  } else if (isOoo) {
    category = "ooo";
  }

  return { is_bounce: isBounce, is_ooo: isOoo, category, failed_recipient: failedRecipient };
}

function cleanOriginalSubject(subject: string): string {
  return subject
    .replace(/^(undeliverable|delivery status notification.*?:|automatic reply:|auto reply:|re:|fwd:)\s*/i, "")
    .trim()
    .slice(0, 300);
}

async function processRep(rep: RepKey): Promise<{ rep: RepKey; scanned: number; logged: number }> {
  const repInbox = repEmailFor(rep);
  let messages: GmailMessageSummary[];
  try {
    messages = await gmailListInboxSince(rep, POLL_WINDOW_MINUTES, 50);
  } catch (err) {
    console.error(`bounce-catcher poll ${rep} failed:`, err);
    return { rep, scanned: 0, logged: 0 };
  }

  let logged = 0;
  for (const msg of messages) {
    const c = classify(msg);
    if (!c) continue;

    try {
      await supabaseRpc("log_system_reply", {
        p_rep_inbox: repInbox,
        p_from_address: (msg.from || "").toLowerCase(),
        p_subject: (msg.subject || "").slice(0, 300),
        p_category: c.category,
        p_failed_recipient: c.failed_recipient,
        p_original_subject: cleanOriginalSubject(msg.subject || ""),
        p_gmail_message_id: msg.id,
        p_gmail_thread_id: msg.threadId,
        p_raw_snippet: `${msg.snippet || ""} ${(msg.body || "").slice(0, 800)}`.slice(0, 1000),
      });
      logged++;
    } catch (err) {
      console.error(`log_system_reply failed (${rep}, ${msg.id}):`, err);
    }

    await gmailMarkRead(rep, msg.id);
  }

  return { rep, scanned: messages.length, logged };
}

async function handle(): Promise<Response> {
  const started = Date.now();
  try {
    const results = await Promise.all(ALL_REPS.map(processRep));
    const total_scanned = results.reduce((a, r) => a + r.scanned, 0);
    const total_logged = results.reduce((a, r) => a + r.logged, 0);
    return Response.json({
      ok: true,
      total_scanned,
      total_logged,
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