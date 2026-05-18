// app/api/gmail/send/route.ts
// Sends an email as the rep via Gmail API and logs it to crm_emails.
// POST body:
// {
//   "rep_email": "bryan@numat.ph",
//   "lead_id": "uuid-or-null",
//   "to": "buyer@example.com",
//   "cc": "optional",
//   "bcc": "optional",
//   "subject": "Quote for NuBam Boards",
//   "body_html": "<p>Hi...</p>",
//   "body_text": "Hi...",
//   "reply_to_message_id": "optional Message-Id header from previous email",
//   "thread_id_to_reply": "optional Gmail thread id",
//   "references_header": "optional"
// }

import { NextRequest, NextResponse } from 'next/server';
import { sendGmail, supabaseAdmin } from '@/lib/gmail';

export async function POST(req: NextRequest) {
  let body: {
    rep_email: string;
    lead_id?: string | null;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body_html?: string;
    body_text?: string;
    reply_to_message_id?: string;
    thread_id_to_reply?: string;
    references_header?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body.rep_email || !body.to || !body.subject) {
    return NextResponse.json(
      { error: 'rep_email, to, subject are required' },
      { status: 400 }
    );
  }

  // Look up the rep's display name from crm_users so new hires
  // automatically have their name on outgoing email without a code change.
  let fromName: string | undefined;
  try {
    const { data: repUser } = await supabaseAdmin
      .from('crm_users')
      .select('name')
      .ilike('email', body.rep_email)
      .maybeSingle();
    if (repUser?.name) fromName = repUser.name;
  } catch {
    // Non-fatal: email still sends, just without a display name.
  }

  try {
    const result = await sendGmail({
      fromEmail: body.rep_email,
      fromName,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      bodyHtml: body.body_html,
      bodyText: body.body_text,
      inReplyToMessageId: body.reply_to_message_id,
      threadIdToReply: body.thread_id_to_reply,
      referencesHeader: body.references_header,
    });

    const sentAt = new Date().toISOString();

    const { error: logError } = await supabaseAdmin.from('crm_emails').insert({
      lead_id: body.lead_id ?? null,
      rep_email: body.rep_email,
      direction: 'sent',
      source: 'crm',
      subject: body.subject,
      body_html: body.body_html ?? null,
      body_text: body.body_text ?? null,
      to_email: body.to,
      from_email: body.rep_email,
      cc: body.cc ?? null,
      bcc: body.bcc ?? null,
      gmail_message_id: result.messageId,
      gmail_thread_id: result.threadId,
      in_reply_to: body.reply_to_message_id ?? null,
      message_references: body.references_header ?? null,
      sent_at: sentAt,
      raw_headers: result.rawHeaders,
    });

    if (logError) {
      // The email already went out. Surface log failure but report 200.
      return NextResponse.json({
        ok: true,
        warning: 'sent_but_log_failed',
        log_error: logError.message,
        gmail_message_id: result.messageId,
        gmail_thread_id: result.threadId,
      });
    }

    // Touch master_leads activity if lead_id supplied
    if (body.lead_id) {
      await supabaseAdmin
        .from('master_leads')
        .update({
          last_rep_touch_at: sentAt,
          last_rep_touch_by: body.rep_email,
          last_rep_touch_subject: body.subject,
          last_activity_at: sentAt,
          last_activity_type: 'crm_email_sent',
        })
        .eq('id', body.lead_id);
    }

    return NextResponse.json({
      ok: true,
      gmail_message_id: result.messageId,
      gmail_thread_id: result.threadId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
