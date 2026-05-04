// app/api/gmail/callback/route.ts
// Receives Google's OAuth callback, exchanges code for tokens,
// stores refresh_token in rep_gmail_tokens, then redirects back to /crm.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/gmail';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? 'https://numatbamboo.com';

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/crm/dashboard?gmail_connect=error&reason=${encodeURIComponent(error)}`
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/crm/dashboard?gmail_connect=error&reason=missing_params`);
  }

  const repEmail = decodeURIComponent(state).toLowerCase();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return NextResponse.redirect(
      `${baseUrl}/crm/dashboard?gmail_connect=error&reason=${encodeURIComponent(txt)}`
    );
  }

  const tokenJson: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  } = await tokenRes.json();

  // Verify which Google account actually approved (must match state)
  const profileRes = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
  );
  const profile: { email: string; name?: string } = await profileRes.json();

  if (profile.email.toLowerCase() !== repEmail) {
    return NextResponse.redirect(
      `${baseUrl}/crm/dashboard?gmail_connect=error&reason=email_mismatch`
    );
  }

  if (!tokenJson.refresh_token) {
    // This happens if the rep already granted consent before. Force re-consent.
    return NextResponse.redirect(
      `${baseUrl}/crm/dashboard?gmail_connect=error&reason=no_refresh_token_revoke_and_retry`
    );
  }

  const expiresAt = new Date(
    Date.now() + tokenJson.expires_in * 1000
  ).toISOString();

  await supabaseAdmin
    .from('rep_gmail_tokens')
    .upsert(
      {
        rep_email: repEmail,
        rep_name: profile.name ?? null,
        refresh_token: tokenJson.refresh_token,
        access_token: tokenJson.access_token,
        token_expires_at: expiresAt,
        scope: tokenJson.scope,
        is_active: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'rep_email' }
    );

  return NextResponse.redirect(
    `${baseUrl}/crm/dashboard?gmail_connect=success&rep=${encodeURIComponent(repEmail)}`
  );
}
