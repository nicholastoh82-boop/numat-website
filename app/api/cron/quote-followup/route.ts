// app/api/cron/quote-followup/route.ts
//
// Quote Follow-up Sequence. Replaces n8n NUMAT — Quote Follow-up Sequence.
// Runs daily 8am MYT (00:00 UTC). For each lead in pipeline_stage='proposal_sent',
// sends two follow-ups keyed off quoted_at:
//   Day 3  (age 3 to 12 days): friendly check-in email from assigned rep
//   Day 12 (age 12 to 16 days): 2-day expiry warning from assigned rep
// Each send is idempotent via quote_followup_day3_sent_at / day12_sent_at columns.

import { authorized, sendGmail, supabaseGet, supabasePatch, type RepKey } from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type StalledQuoteLead = {
  id: string;
  email: string;
  first_name: string | null;
  full_name: string | null;
  company: string | null;
  quoted_at: string;
  deal_value_php: number | null;
  quote_issued_by: string | null;
};

type Enriched = StalledQuoteLead & {
  firstName: string;
  validUntil: string;
  repEmail: string;
  repKey: RepKey;
};

function classifyAndEnrich(lead: StalledQuoteLead, minDays: number, maxDays: number, now: number): Enriched | null {
  if (!lead.quoted_at) return null;
  const age = (now - new Date(lead.quoted_at).getTime()) / (1000 * 60 * 60 * 24);
  if (age < minDays || age >= maxDays) return null;

  const firstName = lead.first_name || lead.full_name?.split(" ")[0] || "there";
  const validUntilMs = new Date(lead.quoted_at).getTime() + 14 * 24 * 60 * 60 * 1000;
  const validUntil = new Date(validUntilMs).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const repEmail = (lead.quote_issued_by || "mohan@numat.ph").toLowerCase();
  const repKey: RepKey = repEmail.includes("bryan") ? "Bryan" : "Mohan";

  return { ...lead, firstName, validUntil, repEmail, repKey };
}

function day3Body(firstName: string, validUntil: string, repName: string): string {
  return (
    `Hi ${firstName},\n\n` +
    `Following up on the quotation I sent across a few days ago. Have you had a chance to look it over?\n\n` +
    `If you have any questions on the pricing or specifications, or want to adjust the quantities, just reply and I will sort it out.\n\n` +
    `The quote is valid until ${validUntil}.\n\n` +
    `Best,\n\n` +
    `${repName}\n\n` +
    `NUMAT Sustainable Manufacturing Inc\n`
  );
}

function day12Body(firstName: string, validUntil: string, repName: string): string {
  return (
    `Hi ${firstName},\n\n` +
    `A quick heads-up that your NUMAT quotation expires on ${validUntil}, 2 days from now.\n\n` +
    `If you want to go ahead, need more time, or have any questions, just reply here and I will take care of it.\n\n` +
    `Best,\n\n` +
    `${repName}\n\n` +
    `NUMAT Sustainable Manufacturing Inc\n`
  );
}

async function sendBatch(
  step: "day3" | "day12",
  leads: StalledQuoteLead[],
  minDays: number,
  maxDays: number,
  markedColumn: "quote_followup_day3_sent_at" | "quote_followup_day12_sent_at"
): Promise<{ sent: number; failed: number }> {
  const now = Date.now();
  const enriched: Enriched[] = [];
  for (const lead of leads) {
    const e = classifyAndEnrich(lead, minDays, maxDays, now);
    if (e) enriched.push(e);
  }

  if (enriched.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const nowIso = new Date().toISOString();

  for (const lead of enriched) {
    const subject =
      step === "day3"
        ? `Quick check-in on your NUMAT quote, ${lead.firstName}`
        : "Your NUMAT quote expires in 2 days";
    const body = step === "day3" ? day3Body(lead.firstName, lead.validUntil, lead.repKey) : day12Body(lead.firstName, lead.validUntil, lead.repKey);

    try {
      await sendGmail({
        from: lead.repKey,
        to: lead.email,
        subject,
        text: body,
      });
      // Mark sent immediately after each successful send to avoid duplicate
      // sends on partial-failure retries
      await supabasePatch(`master_leads?email=eq.${encodeURIComponent(lead.email)}`, {
        [markedColumn]: nowIso,
        last_activity_at: nowIso,
      });
      sent++;
    } catch (err) {
      console.error(`${step} send failed for ${lead.email}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}

async function runQuoteFollowup() {
  // Fetch all leads eligible for day 3 (quoted, not yet day 3 sent)
  const day3Candidates = await supabaseGet<StalledQuoteLead[]>("master_leads", {
    select: "id,email,first_name,full_name,company,quoted_at,deal_value_php,quote_issued_by",
    pipeline_stage: "eq.proposal_sent",
    quote_followup_day3_sent_at: "is.null",
    email: "not.is.null",
    order: "quoted_at.asc",
    limit: "100",
  });

  // Fetch all leads eligible for day 12
  const day12Candidates = await supabaseGet<StalledQuoteLead[]>("master_leads", {
    select: "id,email,first_name,full_name,company,quoted_at,deal_value_php,quote_issued_by",
    pipeline_stage: "eq.proposal_sent",
    quote_followup_day12_sent_at: "is.null",
    email: "not.is.null",
    order: "quoted_at.asc",
    limit: "100",
  });

  const [day3Result, day12Result] = await Promise.all([
    sendBatch("day3", day3Candidates, 3, 12, "quote_followup_day3_sent_at"),
    sendBatch("day12", day12Candidates, 12, 16, "quote_followup_day12_sent_at"),
  ]);

  return {
    day3_candidates: day3Candidates.length,
    day3_sent: day3Result.sent,
    day3_failed: day3Result.failed,
    day12_candidates: day12Candidates.length,
    day12_sent: day12Result.sent,
    day12_failed: day12Result.failed,
  };
}

async function handle(): Promise<Response> {
  const started = Date.now();
  try {
    const result = await runQuoteFollowup();
    return Response.json({ ok: true, ...result, ms: Date.now() - started });
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