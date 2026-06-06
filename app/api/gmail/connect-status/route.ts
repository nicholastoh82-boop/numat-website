// app/api/gmail/connect-status/route.ts
//
// Returns the canonical rep list (active reps + admins from crm_users)
// merged with their Gmail OAuth status from rep_gmail_tokens.
//
// This means the Gmail connection panel automatically reflects new
// hires without any code change.
//
// GET /api/gmail/connect-status

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/gmail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CrmUser = {
  email: string;
  name: string | null;
  role: string | null;
  is_active: boolean;
};

type Token = {
  rep_email: string;
  rep_name: string | null;
  connected_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
};

type MergedRep = {
  rep_email: string;
  rep_name: string | null;
  connected_at: string | null;
  last_used_at: string | null;
  is_active: boolean; // token is_active (not user is_active)
};

export async function GET() {
  // 1. Active reps + admins from crm_users (source of truth for who is on the team)
  const usersRes = await supabaseAdmin
    .from('crm_users')
    .select('email, name, role, is_active')
    .eq('is_active', true)
    .in('role', ['rep', 'admin']);

  if (usersRes.error) {
    return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
  }
  const users = (usersRes.data ?? []) as CrmUser[];

  // 2. All Gmail tokens
  const tokensRes = await supabaseAdmin
    .from('rep_gmail_tokens')
    .select('rep_email, rep_name, connected_at, last_used_at, is_active');

  if (tokensRes.error) {
    return NextResponse.json({ error: tokensRes.error.message }, { status: 500 });
  }
  const tokens = (tokensRes.data ?? []) as Token[];
  const tokensByEmail = new Map<string, Token>();
  for (const t of tokens) {
    tokensByEmail.set(t.rep_email.toLowerCase(), t);
  }

  // 3. Merge: every active rep/admin gets a row; token info appended if present.
  //    Sorted: admin first, then alphabetical by name.
  const merged: MergedRep[] = users
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
      return (a.name ?? a.email).localeCompare(b.name ?? b.email);
    })
    .map((u) => {
      const t = tokensByEmail.get(u.email.toLowerCase());
      return {
        rep_email: u.email,
        rep_name: t?.rep_name ?? u.name ?? null,
        connected_at: t?.connected_at ?? null,
        last_used_at: t?.last_used_at ?? null,
        is_active: Boolean(t?.is_active),
      };
    });

  return NextResponse.json({ reps: merged });
}
