// app/api/cron/buying-signal-scan/route.ts
//
// Vercel Cron: weekly (Monday 02:00 UTC). Picks leads with icp_fit_score >= 60
// that have not had a buying signal scan in the last 7 days, calls Gemini 2.5
// Pro with Google Search grounding to detect real-time buying signals (project
// announcements, hires, fundraises in last 90 days), writes the result back
// to master_leads, and sends a Telegram alert for each hot or warm finding.
//
// Throughput controlled by SIGNAL_SCAN_MAX_PER_RUN env var. Default 25. Cap 100.
// Cost note: Pro with grounded search is ~USD 0.05 per lead, including the
// Google Search grounding fee. A weekly pass on 2000 high-fit leads costs
// roughly USD 100 per week, absorbed by GCP startup credits.

import { authorized, supabaseGetRaw, supabasePatch } from "@/lib/cron/helpers";
import {
  scanBuyingSignals,
  isHotOrWarm,
  type BuyingSignalResult,
} from "@/lib/cron/scan_buying_signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ICP_FIT_THRESHOLD = 60;

type LeadRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  company_domain: string | null;
  country: string | null;
  business_description: string | null;
  icp_fit_score: number | null;
  rep_email: string | null;
  rep_assigned: string | null;
};

function batchSize(): number {
  const raw = process.env.SIGNAL_SCAN_MAX_PER_RUN;
  const n = raw ? parseInt(raw, 10) : 25;
  if (!Number.isFinite(n) || n <= 0) return 25;
  return Math.min(n, 100);
}

async function pickLeads(limit: number): Promise<LeadRow[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const select =
    "id,email,full_name,company,company_domain,country,business_description,icp_fit_score,rep_email,rep_assigned";
  const orFilter = `buying_signal_scanned_at.is.null,buying_signal_scanned_at.lt.${cutoff}`;
  const path =
    `master_leads?select=${select}` +
    `&icp_fit_score=gte.${ICP_FIT_THRESHOLD}` +
    `&company_domain=not.is.null` +
    `&company_domain=neq.` +
    `&status=neq.unsubscribed` +
    `&or=(${orFilter})` +
    `&order=icp_fit_score.desc,buying_signal_scanned_at.asc.nullsfirst` +
    `&limit=${limit}`;
  return (await supabaseGetRaw<LeadRow[]>(path)) ?? [];
}

async function sendTelegramSignalAlert(args: {
  lead: LeadRow;
  result: BuyingSignalResult;
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const evidenceLines = args.result.evidence
    .slice(0, 3)
    .map(
      (e, i) =>
        `${i + 1}. ${e.description} (${e.source_url})`
    )
    .join("\n");

  const repTag = args.lead.rep_assigned || args.lead.rep_email || "unassigned";
  const emoji = args.result.strength === "hot" ? "🔥" : "📈";
  const lines = [
    `${emoji} <b>Buying signal: ${args.result.strength.toUpperCase()}</b>`,
    `<b>Company:</b> ${args.lead.company || "?"}`,
    `<b>Country:</b> ${args.lead.country || "?"}`,
    `<b>ICP fit:</b> ${args.lead.icp_fit_score ?? "?"}`,
    `<b>Assigned:</b> ${repTag}`,
    `<b>Summary:</b> ${args.result.summary}`,
    evidenceLines ? `<b>Evidence:</b>\n${evidenceLines}` : "",
  ].filter(Boolean);

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
    console.error(
      `Telegram alert failed for ${args.lead.email || args.lead.id}:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

async function persistResult(lead: LeadRow, result: BuyingSignalResult): Promise<void> {
  const now = new Date().toISOString();
  const detected = isHotOrWarm(result.strength) ? now : null;

  await supabasePatch(`master_leads?id=eq.${lead.id}`, {
    buying_signal_strength: result.strength,
    buying_signal_summary: result.summary || null,
    buying_signal_evidence: result.evidence,
    buying_signal_detected_at: detected,
    buying_signal_scanned_at: now,
    updated_at: now,
  });
}

async function processOne(lead: LeadRow): Promise<{
  id: string;
  email: string | null;
  status: "ok" | "error";
  strength?: string;
  error?: string;
}> {
  try {
    const result = await scanBuyingSignals({
      company_name: lead.company,
      company_domain: lead.company_domain,
      country: lead.country,
      business_description: lead.business_description,
    });
    await persistResult(lead, result);

    if (isHotOrWarm(result.strength)) {
      await sendTelegramSignalAlert({ lead, result });
    }

    return {
      id: lead.id,
      email: lead.email,
      status: "ok",
      strength: result.strength,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `buying signal scan failed for ${lead.email || lead.id}:`,
      msg
    );
    // Touch buying_signal_scanned_at to recent past so we don't immediately
    // retry the same failing lead next run.
    const retryAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await supabasePatch(`master_leads?id=eq.${lead.id}`, {
        buying_signal_scanned_at: retryAt,
      });
    } catch {
      // ignore
    }
    return {
      id: lead.id,
      email: lead.email,
      status: "error",
      error: msg.slice(0, 200),
    };
  }
}

async function handle(): Promise<Response> {
  const started = Date.now();
  const limit = batchSize();

  let leads: LeadRow[];
  try {
    leads = await pickLeads(limit);
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: `pickLeads failed: ${err instanceof Error ? err.message : String(err)}`,
        ms: Date.now() - started,
      },
      { status: 500 }
    );
  }

  const results: Awaited<ReturnType<typeof processOne>>[] = [];
  for (const lead of leads) {
    results.push(await processOne(lead));
  }

  const ok_count = results.filter((r) => r.status === "ok").length;
  const err_count = results.filter((r) => r.status === "error").length;
  const hot_count = results.filter((r) => r.strength === "hot").length;
  const warm_count = results.filter((r) => r.strength === "warm").length;

  return Response.json({
    ok: true,
    batch_size: limit,
    picked: leads.length,
    ok_count,
    err_count,
    hot_count,
    warm_count,
    results,
    ms: Date.now() - started,
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return handle();
}
