// app/api/crm/email-drafts/route.ts
//
// Admin-only API for the email drafts review UI at /crm/outreach.
// Nick uses this to list, approve, reject, edit, or mark drafts as sent.
//
// Auth: Supabase session cookie + crm_users.role = 'admin' + is_active.
//
// GET    /api/crm/email-drafts                              List all
// GET    /api/crm/email-drafts?status=pending_review        List by status
// PATCH  /api/crm/email-drafts                              Body: { id, ...fields }

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function authorizeAdmin(): Promise<{ email: string } | null> {
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

    if (!crmUser?.is_active || crmUser.role !== 'admin') return null;
    return { email: crmUser.email };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const admin = await authorizeAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  let query = adminClient
    .from('email_drafts')
    .select(
      'id,lead_id,recipient_email,recipient_name,company,rep_email,rep_name,subject,body,status,buying_signal_strength,generated_by,generated_at,reviewed_at,sent_at,rejection_reason,gmail_message_id,gmail_thread_id,sent_detected_at,reply_detected_at,reply_snippet,reply_from_email'
    )
    .order('generated_at', { ascending: false })
    .limit(500);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, drafts: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await authorizeAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      subject?: string;
      body?: string;
      rejection_reason?: string;
    };
    if (!body.id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const allowedStatuses = [
      'pending_review',
      'digest_sent',
      'approved',
      'rejected',
      'sent',
      'sent_by_rep',
      'replied',
      'skipped',
    ];
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {
      reviewed_by: admin.email,
      reviewed_at: new Date().toISOString(),
    };
    if (body.status) patch.status = body.status;
    if (body.subject !== undefined) patch.subject = String(body.subject).slice(0, 200);
    if (body.body !== undefined) patch.body = String(body.body);
    if (body.rejection_reason !== undefined)
      patch.rejection_reason = body.rejection_reason
        ? String(body.rejection_reason).slice(0, 1000)
        : null;
    if (body.status === 'sent') patch.sent_at = new Date().toISOString();

    const { error } = await adminClient
      .from('email_drafts')
      .update(patch)
      .eq('id', body.id);
    if (error) {
      // Log full Supabase error object so we can see code, details, hint in
      // Vercel runtime logs. Return only the message string to the client.
      console.error('email_drafts PATCH supabase error:', {
        id: body.id,
        admin: admin.email,
        patch_keys: Object.keys(patch),
        code: (error as { code?: string }).code,
        details: (error as { details?: string }).details,
        hint: (error as { hint?: string }).hint,
        message: error.message,
      });
      return NextResponse.json(
        { error: typeof error.message === 'string' ? error.message : 'database update failed' },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Unexpected runtime error. Make sure the client gets a string, log the
    // full thing so we can read it in Vercel runtime logs.
    console.error('email_drafts PATCH uncaught error:', e);
    const message = e instanceof Error ? e.message : 'unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
