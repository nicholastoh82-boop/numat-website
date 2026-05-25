// app/api/cron/daily-rep-telegram/route.ts
//
// Vercel Cron: daily at 10:00 UTC (6pm MYT).
// Sends one Telegram report covering the last 24 hours:
//   1. Emails sent per rep (Mohan and Eugene), counted from crm_emails so it
//      includes both hand written Gmail sends and system sends.
//   2. Replies per rep, counted from crm_emails received messages that are
//      matched to a known lead.
//   3. A reply detail list naming the company and which rep the reply went to.
//
// Auth: Authorization: Bearer ${CRON_SECRET}
//
// vercel.json:
//   { "path": "/api/cron/daily-rep-telegram", "schedule": "0 10 * * *" }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

// Reps to report on, in display order.
const REPS: Array<{ email: string; name: string }> = [
  { email: "mohan@numat.ph", name: "Mohan" },
  { email: "eugene@numat.ph", name: "Eugene" },
];
const REP_EMAILS = REPS.map((r) => r.email);
const NAME_BY_EMAIL: Record<string, string> = Object.fromEntries(
  REPS.map((r) => [r.email, r.name])
);

type SentRow = { rep_email: string };
type ReplyRow = {
  rep_email: string;
  from_email: string | null;
  subject: string | null;
  lead_id: string | null;
  received_at: string | null;
};
type LeadRow = { id: string; company: string | null; full_name: string | null };

async function sendTelegram(text: string): Promise<boolean> {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    }
  );
  return res.ok;
}

function escapeMd(value: string): string {
  // Escape Markdown control characters so company names render cleanly.
  return value.replace(/([_*`\[\]])/g, "\\$1");
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sinceISO = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Sent in the last 24 hours, per rep.
  const { data: sentData, error: sentErr } = await supabase
    .from("crm_emails")
    .select("rep_email")
    .eq("direction", "sent")
    .gte("sent_at", sinceISO)
    .in("rep_email", REP_EMAILS);
  if (sentErr) {
    return NextResponse.json({ error: sentErr.message }, { status: 500 });
  }
  const sentRows = (sentData ?? []) as SentRow[];
  const sentByRep: Record<string, number> = {};
  for (const e of REP_EMAILS) sentByRep[e] = 0;
  for (const row of sentRows) {
    if (row.rep_email in sentByRep) sentByRep[row.rep_email] += 1;
  }

  // 2. Replies in the last 24 hours, per rep (received + matched to a lead).
  const { data: replyData, error: replyErr } = await supabase
    .from("crm_emails")
    .select("rep_email, from_email, subject, lead_id, received_at")
    .eq("direction", "received")
    .not("lead_id", "is", null)
    .gte("received_at", sinceISO)
    .in("rep_email", REP_EMAILS)
    .order("received_at", { ascending: true });
  if (replyErr) {
    return NextResponse.json({ error: replyErr.message }, { status: 500 });
  }
  const replyRows = (replyData ?? []) as ReplyRow[];
  const repliesByRep: Record<string, number> = {};
  for (const e of REP_EMAILS) repliesByRep[e] = 0;
  for (const row of replyRows) {
    if (row.rep_email in repliesByRep) repliesByRep[row.rep_email] += 1;
  }

  // Company lookup for the reply detail list.
  const leadIds = Array.from(
    new Set(replyRows.map((r) => r.lead_id).filter((x): x is string => !!x))
  );
  const companyByLead: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leadData } = await supabase
      .from("master_leads")
      .select("id, company, full_name")
      .in("id", leadIds);
    for (const l of (leadData ?? []) as LeadRow[]) {
      companyByLead[l.id] = l.company || l.full_name || "";
    }
  }

  // Build the message.
  const fmt = (d: Date) =>
    d.toLocaleString("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  const windowLabel = `${fmt(new Date(now.getTime() - 24 * 60 * 60 * 1000))} to ${fmt(now)} MYT`;

  const lines: string[] = [];
  lines.push("*NUMAT Daily Outreach*");
  lines.push(`_${windowLabel}_`);
  lines.push("");
  lines.push("*Emails sent (last 24h)*");
  for (const r of REPS) lines.push(`\u2022 ${r.name}: ${sentByRep[r.email]}`);
  lines.push("");
  lines.push("*Replies (last 24h)*");
  for (const r of REPS) lines.push(`\u2022 ${r.name}: ${repliesByRep[r.email]}`);

  if (replyRows.length > 0) {
    lines.push("");
    lines.push("*Reply details*");
    for (const row of replyRows) {
      const who = NAME_BY_EMAIL[row.rep_email] || row.rep_email;
      const company =
        (row.lead_id && companyByLead[row.lead_id]) ||
        row.from_email ||
        "Unknown sender";
      lines.push(`\u2022 ${escapeMd(company)} \u2192 ${who}`);
    }
  } else {
    lines.push("");
    lines.push("No replies in the last 24 hours.");
  }

  const text = lines.join("\n");
  const ok = await sendTelegram(text);

  return NextResponse.json({
    ok,
    window_since: sinceISO,
    sent_by_rep: sentByRep,
    replies_by_rep: repliesByRep,
    reply_count: replyRows.length,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
