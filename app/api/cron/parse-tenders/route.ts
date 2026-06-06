// app/api/cron/parse-tenders/route.ts
//
// Vercel Cron: every 30 minutes. Reads recent PhilGEPS bid notice emails from
// nick@numat.ph, parses each with Gemini into structured tender fields, scores
// NUMAT fit, writes to numat_tenders (dedup by gmail_message_id and reference
// number), and sends a Telegram alert to Bryan for any tender scoring >= 50.
//
// Path A design: PhilGEPS emails bid notices to subscribed suppliers. We parse
// the email rather than scraping the PhilGEPS site (which has bot protection
// and frequent downtime). Nick subscribes to product categories once in the
// PhilGEPS portal; notices then flow in automatically.

import {
  authorized,
  supabaseGetRaw,
  supabasePost,
  supabasePatch,
  gmailListInboxSince,
} from '@/lib/cron/helpers';
import { parseTenderEmail } from '@/lib/cron/parse_tender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FIT_ALERT_THRESHOLD = 50;
const LOOKBACK_MINUTES = 45; // overlap the 30-min schedule slightly

// PhilGEPS sender domains and subject markers that indicate a real bid notice.
function looksLikeTenderEmail(from: string, subject: string): boolean {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();
  const fromPhilgeps = f.includes('philgeps.gov.ph');
  // Exclude the obvious non-notices.
  const isNoise =
    s.includes('otp') ||
    s.includes('verification') ||
    s.includes('login') ||
    s.includes('registration') ||
    s.includes('password');
  const looksLikeNotice =
    s.includes('bid') ||
    s.includes('notice') ||
    s.includes('opportunity') ||
    s.includes('tender') ||
    s.includes('procurement') ||
    s.includes('rfq') ||
    s.includes('itb');
  return fromPhilgeps && !isNoise && looksLikeNotice;
}

async function alreadyIngested(gmailId: string): Promise<boolean> {
  const rows = await supabaseGetRaw<Array<{ id: string }>>(
    `numat_tenders?select=id&gmail_message_id=eq.${gmailId}&limit=1`,
  );
  return (rows ?? []).length > 0;
}

async function sendTenderAlert(args: {
  title: string;
  agency: string | null;
  budget: number | null;
  closing: string | null;
  score: number;
  product: string | null;
  url: string | null;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const budgetStr = args.budget
    ? `PHP ${args.budget.toLocaleString()}`
    : 'budget not stated';
  const lines = [
    `🏛️ <b>PhilGEPS tender (fit ${args.score})</b>`,
    `<b>${args.title}</b>`,
    `<b>Agency:</b> ${args.agency || '?'}`,
    `<b>Budget:</b> ${budgetStr}`,
    args.closing ? `<b>Closes:</b> ${args.closing}` : '',
    args.product ? `<b>Suggested product:</b> ${args.product}` : '',
    args.url ? `<b>Link:</b> ${args.url}` : '',
    `<b>Assigned:</b> Bryan`,
  ].filter(Boolean);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('tender telegram alert failed:', e);
    return false;
  }
}

async function handle(): Promise<Response> {
  const started = Date.now();

  let messages;
  try {
    messages = await gmailListInboxSince('Nick', LOOKBACK_MINUTES, 50);
  } catch (e) {
    return Response.json(
      { ok: false, error: `gmail list failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }

  const candidates = messages.filter((m) => looksLikeTenderEmail(m.from, m.subject));

  const results: Array<{
    gmail_id: string;
    subject: string;
    action: 'ingested' | 'skipped_duplicate' | 'skipped_not_tender' | 'error';
    score?: number;
    alerted?: boolean;
    error?: string;
  }> = [];

  for (const msg of candidates) {
    try {
      if (await alreadyIngested(msg.id)) {
        results.push({ gmail_id: msg.id, subject: msg.subject, action: 'skipped_duplicate' });
        continue;
      }

      const parsed = await parseTenderEmail({
        subject: msg.subject,
        body: msg.body || msg.snippet || '',
        receivedDate: msg.date,
      });

      if (!parsed.is_tender) {
        results.push({ gmail_id: msg.id, subject: msg.subject, action: 'skipped_not_tender' });
        continue;
      }

      const nowIso = new Date().toISOString();
      const shouldAlert = parsed.numat_fit_score >= FIT_ALERT_THRESHOLD;
      let alerted = false;
      if (shouldAlert) {
        alerted = await sendTenderAlert({
          title: parsed.title || msg.subject,
          agency: parsed.agency,
          budget: parsed.approved_budget_php,
          closing: parsed.closing_date,
          score: parsed.numat_fit_score,
          product: parsed.recommended_product,
          url: parsed.philgeps_url,
        });
      }

      await supabasePost('numat_tenders', {
        reference_number: parsed.reference_number,
        title: parsed.title || msg.subject,
        agency: parsed.agency,
        category: parsed.category,
        description: parsed.description,
        approved_budget_php: parsed.approved_budget_php,
        closing_date: parsed.closing_date,
        posted_date: parsed.posted_date,
        area_of_delivery: parsed.area_of_delivery,
        philgeps_url: parsed.philgeps_url,
        status: shouldAlert ? 'to_review' : 'low_fit',
        numat_fit_score: parsed.numat_fit_score,
        recommended_product: parsed.recommended_product,
        ai_assessment: {
          fit_reasoning: parsed.fit_reasoning,
          model: parsed.model,
        },
        assigned_to: shouldAlert ? 'bryan@numat.ph' : null,
        source: 'philgeps_email',
        gmail_message_id: msg.id,
        raw_email: (msg.body || msg.snippet || '').slice(0, 8000),
        raw_email_received_at: msg.date,
        parsed_by_cron_at: nowIso,
        telegram_alerted_at: alerted ? nowIso : null,
      });

      results.push({
        gmail_id: msg.id,
        subject: msg.subject,
        action: 'ingested',
        score: parsed.numat_fit_score,
        alerted,
      });
    } catch (e) {
      console.error(`tender parse failed for ${msg.id}:`, e);
      results.push({
        gmail_id: msg.id,
        subject: msg.subject,
        action: 'error',
        error: (e instanceof Error ? e.message : String(e)).slice(0, 200),
      });
    }
  }

  return Response.json({
    ok: true,
    scanned: messages.length,
    candidates: candidates.length,
    ingested: results.filter((r) => r.action === 'ingested').length,
    alerted: results.filter((r) => r.alerted).length,
    results,
    ms: Date.now() - started,
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}
