// app/api/cron/send-daily-outreach-digest/route.ts
//
// Vercel Cron: 8am MYT Mon to Fri (cron 0 0 * * 1-5 in UTC).
//
// Reads pending_review drafts from email_drafts and emails them in a
// digest to the assigned rep, sent from nick@numat.ph.
//
// One digest email per rep. Each draft section shows the recipient
// company subject body, plus a one click 'Open in Gmail' compose link
// so the rep can drop the email straight into their own outbox.
//
// After sending the digest, the drafts are marked status='digest_sent'
// so they aren't re-sent in tomorrow's digest. Reps still flip them to
// 'sent' from the /crm/outreach UI after they actually fire off the
// outbound email.

import { authorized, supabaseGetRaw, supabasePatch, sendGmail } from '@/lib/cron/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type DraftRow = {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  company: string | null;
  rep_email: string;
  rep_name: string | null;
  subject: string;
  body: string;
  status: string;
  buying_signal_strength: string | null;
};

const REP_KEY_BY_EMAIL: Record<string, 'Nick' | 'Mohan' | 'Bryan' | 'Eugene'> = {
  'nick@numat.ph': 'Nick',
  'mohan@numat.ph': 'Mohan',
  'bryan@numat.ph': 'Bryan',
  'eugene@numat.ph': 'Eugene',
};

function gmailComposeUrl(d: DraftRow): string {
  // Gmail web compose deep link. Opens a new compose window with To, Subject,
  // and Body prefilled. Rep just hits Send.
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: d.recipient_email,
    su: d.subject,
    body: d.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDigestHtml(rep_name: string, drafts: DraftRow[]): string {
  const intro = `
    <p>Hi ${escapeHtml(rep_name)},</p>
    <p>Your ${drafts.length} cold outreach drafts for today are below. Each one has a 'Compose in Gmail' button that opens a pre filled email in your inbox. Hit Send when you are ready.</p>
    <p>Reply to this email if any draft needs changes before you send.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  `;

  const items = drafts
    .map((d, idx) => {
      const url = gmailComposeUrl(d);
      return `
        <div style="margin-bottom:32px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="font-size:13px;color:#64748b;margin-bottom:4px">Draft ${idx + 1} of ${drafts.length}</div>
          <div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:8px">${escapeHtml(d.company || 'Unknown')} &mdash; ${escapeHtml(d.recipient_name || d.recipient_email)}</div>
          <div style="font-size:13px;color:#475569;margin-bottom:12px">To: ${escapeHtml(d.recipient_email)}</div>
          <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:6px">Subject: ${escapeHtml(d.subject)}</div>
          <pre style="font-family:inherit;font-size:14px;color:#1e293b;background:#fff;padding:12px;border-radius:6px;white-space:pre-wrap;word-wrap:break-word;margin:0 0 12px 0;line-height:1.5">${escapeHtml(d.body)}</pre>
          <a href="${url}" style="display:inline-block;padding:10px 16px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">Compose in Gmail</a>
        </div>
      `;
    })
    .join('');

  return `
    <html><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:680px;margin:0 auto;padding:24px;background:#fff">
      ${intro}
      ${items}
      <p style="font-size:13px;color:#64748b;margin-top:32px">Generated automatically by Claude daily outreach pipeline. To pause this, set the cron schedule in vercel.json to none.</p>
    </body></html>
  `.trim();
}

async function handle(): Promise<Response> {
  const started = Date.now();

  // Pick all pending_review drafts that have not been digested yet. The
  // status check on 'pending_review' ensures we don't re-send things Nick
  // approved or rejected.
  const drafts = await supabaseGetRaw<DraftRow[]>(
    'email_drafts' +
      '?select=id,recipient_email,recipient_name,company,rep_email,rep_name,subject,body,status,buying_signal_strength' +
      '&status=eq.pending_review' +
      '&rep_email=in.(mohan@numat.ph,eugene@numat.ph)' +
      '&order=rep_email.asc,company.asc'
  );

  if (drafts.length === 0) {
    return Response.json({
      ok: true,
      message: 'No pending drafts to digest.',
      ms: Date.now() - started,
    });
  }

  // Group by rep_email.
  const byRep = new Map<string, DraftRow[]>();
  for (const d of drafts) {
    if (!byRep.has(d.rep_email)) byRep.set(d.rep_email, []);
    byRep.get(d.rep_email)!.push(d);
  }

  const sendResults: Array<{
    rep_email: string;
    drafts: number;
    status: 'ok' | 'error';
    error?: string;
  }> = [];

  for (const [repEmail, repDrafts] of byRep) {
    const repName = repDrafts[0].rep_name || repEmail.split('@')[0];
    try {
      const html = buildDigestHtml(repName, repDrafts);
      const today = new Date().toISOString().slice(0, 10);
      await sendGmail({
        from: 'Nick',
        to: repEmail,
        subject: `NUMAT Daily Outreach Drafts: ${today} (${repDrafts.length} leads)`,
        html,
      });

      // Mark these drafts as digest_sent so we don't re-send tomorrow.
      const ids = repDrafts.map((d) => `"${d.id}"`).join(',');
      await supabasePatch(`email_drafts?id=in.(${encodeURIComponent(ids)})`, {
        status: 'digest_sent',
      });

      sendResults.push({
        rep_email: repEmail,
        drafts: repDrafts.length,
        status: 'ok',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sendResults.push({
        rep_email: repEmail,
        drafts: repDrafts.length,
        status: 'error',
        error: msg.slice(0, 200),
      });
    }
  }

  return Response.json({
    ok: true,
    digests: sendResults,
    total_drafts: drafts.length,
    ms: Date.now() - started,
  });
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}
export async function POST(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}
