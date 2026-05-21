// app/api/crm/profile/route.ts
//
// Lets a logged-in CRM user read and update their own Gmail signature.
// The signature is appended at send time when a rep uses the "Send Now"
// button in /crm/outreach (which calls the Gmail API directly and bypasses
// Gmail's UI auto-signature feature).
//
// Auth: Supabase session cookie + crm_users.is_active. Any active rep or
// admin can manage their own signature.
//
// GET    /api/crm/profile                Returns { email, name, role, signature_html, signature_updated_at }
// PATCH  /api/crm/profile                Body: { signature_html: string }

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

async function authorizeUser(): Promise<{ email: string } | null> {
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
    return { email: crmUser.email };
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await authorizeUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { data, error } = await adminClient
    .from('crm_users')
    .select('email, name, role, signature_html, signature_updated_at')
    .eq('email', user.email)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const user = await authorizeUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let body: { signature_html?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const sig = typeof body.signature_html === 'string' ? body.signature_html : null;
  // 32 KB cap. A normal Gmail signature is well under 5 KB even with an
  // inline base64 logo, but allow some room for verbose ones.
  if (sig && sig.length > 32 * 1024) {
    return NextResponse.json({ error: 'signature too large (32 KB max)' }, { status: 400 });
  }
  const { error } = await adminClient
    .from('crm_users')
    .update({
      signature_html: sig,
      signature_updated_at: new Date().toISOString(),
    })
    .eq('email', user.email);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
