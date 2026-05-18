// app/api/gmail/auth/route.ts
// Starts the Google OAuth flow for a rep. Call from CRM:
//   GET /api/gmail/auth?rep_email=bryan@numat.ph
//
// Whitelist is read dynamically from crm_users (active reps + admins).
// Any new hire added to crm_users can immediately connect Gmail.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/gmail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export async function GET(req: NextRequest) {
  const repEmail = req.nextUrl.searchParams.get('rep_email');
  if (!repEmail) {
    return NextResponse.json({ error: 'rep_email is required' }, { status: 400 });
  }

  // Verify the email belongs to an active rep or admin in crm_users.
  const { data: user, error } = await supabaseAdmin
    .from('crm_users')
    .select('email, is_active, role')
    .ilike('email', repEmail)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!user || !user.is_active || !['rep', 'admin'].includes(user.role ?? '')) {
    return NextResponse.json({ error: 'rep_email not allowed' }, { status: 403 });
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    login_hint: repEmail,
    state: encodeURIComponent(repEmail),
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
