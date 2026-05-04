// app/api/crm/lead_emails/route.ts
//
// Returns the recent crm_emails rows for a single lead, newest first.
// Used by the EmailHistoryDrawer in the CRM dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/gmail';

const MAX_ROWS = 100;
const BODY_PREVIEW_CHARS = 200;

type EmailRow = {
  id: string;
  direction: string | null;
  source: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  to_email: string | null;
  from_email: string | null;
  cc: string | null;
  rep_email: string | null;
  gmail_thread_id: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string | null;
};

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('lead_id');
  if (!leadId) {
    return NextResponse.json(
      { ok: false, error: 'lead_id is required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('crm_emails')
    .select(
      'id, direction, source, subject, snippet, body_text, to_email, from_email, cc, rep_email, gmail_thread_id, sent_at, received_at, created_at'
    )
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .order('received_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(MAX_ROWS);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const emails: EmailRow[] = (data ?? []).map((row) => {
    const r = row as EmailRow;
    return {
      ...r,
      body_text: r.body_text
        ? r.body_text.slice(0, BODY_PREVIEW_CHARS)
        : null,
    };
  });

  return NextResponse.json({ ok: true, emails });
}
