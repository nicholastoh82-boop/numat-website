// app/api/crm/email-drafts/send/route.ts
//
// Send a single email_drafts row via the Gmail API from the rep's own
// inbox, appending their saved signature_html (set via /crm/profile).
//
// Auth: any active rep or admin who is logged in. The send is performed
// using the rep_email on the draft row (not the caller's identity) so an
// admin can send on behalf of a rep if needed.
//
// POST /api/crm/email-drafts/send  Body: { id: string }

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { sendGmail, RepKey, repEmailFor, ALL_REPS } from '@/lib/cron/helpers';
import { getRepToken, sendGmail as sendGmailConnected } from '@/lib/gmail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function authorizeUser(): Promise<{ email: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.email) return null;
    const { data: crmUser } = await adminClient
      .from('crm_users')
      .select('email, role, is_active')
      .eq('email', user.email)
      .single();
    if (!crmUser?.is_active || !['rep', 'admin'].includes(crmUser.role ?? '')) return null;
    return { email: crmUser.email, role: crmUser.role ?? 'rep' };
  } catch {
    return null;
  }
}

function repKeyFor(repEmail: string): RepKey | null {
  for (const r of ALL_REPS) {
    if (repEmailFor(r).toLowerCase() === repEmail.toLowerCase()) return r;
  }
  return null;
}

// Lightweight escape so plaintext drafts render safely as HTML body.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convert the plaintext draft body to a safe HTML block. Preserves
// paragraph breaks (double newlines) and line breaks within paragraphs.
function plaintextToHtml(text: string): string {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 12px 0">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`
    )
    .join('');
}

export async function POST(req: NextRequest) {
  const user = await authorizeUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // Load the draft.
  const { data: draft, error: draftErr } = await adminClient
    .from('email_drafts')
    .select(
      'id,lead_id,recipient_email,company,rep_email,subject,body,status,gmail_message_id'
    )
    .eq('id', body.id)
    .single();
  if (draftErr || !draft) {
    return NextResponse.json({ error: 'draft not found' }, { status: 404 });
  }
  if (draft.gmail_message_id) {
    return NextResponse.json(
      { error: 'draft already sent', gmail_message_id: draft.gmail_message_id },
      { status: 409 }
    );
  }

  // Non-admin reps can only send their own drafts.
  if (user.role !== 'admin' && user.email.toLowerCase() !== draft.rep_email.toLowerCase()) {
    return NextResponse.json({ error: 'not your draft' }, { status: 403 });
  }

  const rep = repKeyFor(draft.rep_email);

  // A rep can send if they have a connected mailbox (rep_gmail_tokens, the per rep
  // OAuth flow) or, for the older setup, a known env token (a RepKey like Bryan).
  // This lets Erica, Janna, and Lionel send once they connect, even though they
  // are not in the legacy env-token list.
  let connected = false;
  try {
    await getRepToken(draft.rep_email);
    connected = true;
  } catch {
    connected = false;
  }
  if (!connected && !rep) {
    return NextResponse.json(
      { error: `No Gmail connection for ${draft.rep_email}. Connect Gmail in the portal first.` },
      { status: 400 }
    );
  }

  // Fetch the rep's saved signature.
  const { data: repUser } = await adminClient
    .from('crm_users')
    .select('signature_html')
    .eq('email', draft.rep_email)
    .single();
  const signatureHtml = repUser?.signature_html?.trim() || '';

  // Build the HTML body: draft text as paragraphs, then signature.
  const draftHtml = plaintextToHtml(draft.body || '');
  const signatureBlock = signatureHtml
    ? `<div style="margin-top:18px">${signatureHtml}</div>`
    : '';
  const fullHtml = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">${draftHtml}${signatureBlock}</div>`;

  let gmailMessageId: string;
  try {
    if (connected) {
      const sent = await sendGmailConnected({
        fromEmail: draft.rep_email,
        to: draft.recipient_email,
        subject: draft.subject || '(no subject)',
        bodyHtml: fullHtml,
        bodyText: draft.body || '',
      });
      gmailMessageId = sent.messageId;
    } else {
      gmailMessageId = await sendGmail({
        from: rep!,
        to: draft.recipient_email,
        subject: draft.subject || '(no subject)',
        html: fullHtml,
        // Plain text fallback uses the raw draft body. Signature is omitted
        // from the plaintext alternative since it's HTML markup.
        text: draft.body || '',
      });
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Gmail send failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  const nowIso = new Date().toISOString();

  // Persist the send. The hourly scan-rep-outreach cron will fill in the
  // gmail_thread_id within an hour by re-reading the Sent folder; we set
  // status here so the UI reflects it immediately.
  await adminClient
    .from('email_drafts')
    .update({
      gmail_message_id: gmailMessageId,
      sent_detected_at: nowIso,
      sent_at: nowIso,
      status: 'sent_by_rep',
      reviewed_at: nowIso,
    })
    .eq('id', draft.id);

  // Mirror the activity on master_leads so the existing pipeline sees the send.
  if (draft.lead_id) {
    await adminClient
      .from('master_leads')
      .update({
        email_1_sent: true,
        last_email_sent: nowIso,
        outreach_started_at: nowIso,
        last_activity_at: nowIso,
        last_activity_type: 'email_sent',
        current_email_num: 1,
        last_rep_touch_at: nowIso,
        last_rep_touch_by: draft.rep_email,
        last_rep_touch_subject: draft.subject,
      })
      .eq('id', draft.lead_id);
  }

  // Log a sent event so the weekly report picks it up.
  try {
    await adminClient.from('sequence_events').insert({
      email: draft.recipient_email,
      company: draft.company,
      sequence_name: 'cold_outreach_v1',
      sequence_step: 1,
      email_subject: draft.subject,
      format_version: '2026-05-21-crm-send',
      event_type: 'sent',
      rooms: {
        rep_email: draft.rep_email,
        draft_id: draft.id,
        sent_via: 'crm',
        signature_attached: signatureHtml.length > 0,
      },
    });
  } catch (e) {
    console.error('sequence_events insert (crm send) failed:', e);
  }

  return NextResponse.json({
    ok: true,
    gmail_message_id: gmailMessageId,
    signature_attached: signatureHtml.length > 0,
  });
}
