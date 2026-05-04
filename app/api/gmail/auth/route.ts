// app/api/gmail/auth/route.ts
// Starts the Google OAuth flow for a rep. Call from CRM:
//   GET /api/gmail/auth?rep_email=bryan@numat.ph

import { NextRequest, NextResponse } from 'next/server';

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

  const allowed = ['nick@numat.ph', 'bryan@numat.ph', 'mohan@numat.ph'];
  if (!allowed.includes(repEmail.toLowerCase())) {
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
