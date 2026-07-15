// app/api/crm/email-stats/route.ts
//
// Email productivity counter, scoped by portal role.
//   admin (Nick) and ceo (Mark): see every rep.
//   sales (Mohan, Eugene, Bryan): see only their own row.
// Counts come from crm_emails (every send and reply, hand written or system),
// aggregated by the rep_email_stats Postgres function.
//
// GET /api/crm/email-stats?granularity=day|month
//   day   -> last 30 days, bucketed per MYT day
//   month -> last 12 months, bucketed per month

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Roles that may view every rep. Everyone else is scoped to their own email.
const SEE_ALL_ROLES = ['admin', 'ceo'];

// Non admin, non ceo people who still see every rep's email activity, for
// example the Head of Marketing who oversees the sales reps.
const SEE_ALL_EMAILS = ['erica@numat.ph'];

const REP_DISPLAY_NAME: Record<string, string> = {
  'nick@numat.ph': 'Nick',
  'bryan@numat.ph': 'Bryan',
  'mohan@numat.ph': 'Mohan',
  'eugene@numat.ph': 'Eugene',
  'erica@numat.ph': 'Erica',
};

type StatRow = { rep_email: string; bucket: string; sent: number; replies: number };

async function authorizeUser(): Promise<{ email: string; roles: string[] } | null> {
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
      },
    );
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.email) return null;
    const { data: roleRows } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const roles = ((roleRows ?? []) as Array<{ role: string }>).map((r) => r.role);
    if (roles.length === 0) return null;
    return { email: user.email.toLowerCase(), roles };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await authorizeUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const granularity = url.searchParams.get('granularity') === 'month' ? 'month' : 'day';

  // Window: 30 days for the day view, 12 months for the month view.
  const now = new Date();
  const since = new Date(now);
  if (granularity === 'month') {
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
  } else {
    since.setDate(since.getDate() - 29);
  }

  const { data, error } = await adminClient.rpc('rep_email_stats', {
    p_granularity: granularity,
    p_since: since.toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = ((data ?? []) as StatRow[]).map((r) => ({
    rep_email: r.rep_email,
    rep_name: REP_DISPLAY_NAME[r.rep_email] || r.rep_email,
    bucket: r.bucket,
    sent: Number(r.sent) || 0,
    replies: Number(r.replies) || 0,
  }));

  const seeAll =
    user.roles.some((r) => SEE_ALL_ROLES.includes(r)) || SEE_ALL_EMAILS.includes(user.email);
  if (!seeAll) {
    rows = rows.filter((r) => r.rep_email === user.email);
  }

  // Reps present in scope, ordered by total sent.
  const repTotals: Record<string, { rep_email: string; rep_name: string; sent: number; replies: number }> = {};
  for (const r of rows) {
    if (!repTotals[r.rep_email]) {
      repTotals[r.rep_email] = { rep_email: r.rep_email, rep_name: r.rep_name, sent: 0, replies: 0 };
    }
    repTotals[r.rep_email].sent += r.sent;
    repTotals[r.rep_email].replies += r.replies;
  }
  const reps = Object.values(repTotals).sort((a, b) => b.sent - a.sent);

  const grandTotal = reps.reduce(
    (acc, r) => ({ sent: acc.sent + r.sent, replies: acc.replies + r.replies }),
    { sent: 0, replies: 0 },
  );

  return NextResponse.json({
    granularity,
    scope: seeAll ? 'all' : 'self',
    reps,
    rows,
    totals: grandTotal,
  });
}
