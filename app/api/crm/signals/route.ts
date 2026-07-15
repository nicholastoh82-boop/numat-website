// app/api/crm/signals/route.ts
//
// Lists leads that have a fresh hot or warm buying signal, scoped to the
// caller's lead routing (Philippines reps see PH leads, international reps
// see the rest, admins see all). Powers the /crm/signals dashboard.
//
// GET /api/crm/signals?strength=hot|warm|all&limit=50

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
      },
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

export async function GET(req: NextRequest) {
  const user = await authorizeUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const strength = url.searchParams.get('strength') ?? 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);

  let query = adminClient
    .from('master_leads')
    .select(
      'id,email,full_name,first_name,company,country,city,segment,' +
        'business_description,icp_fit_score,buying_signal_strength,' +
        'buying_signal_summary,buying_signal_evidence,buying_signal_detected_at,' +
        'rep_email,rep_assigned',
    )
    .not('buying_signal_detected_at', 'is', null)
    .order('buying_signal_detected_at', { ascending: false })
    .limit(limit);

  if (strength === 'hot' || strength === 'warm') {
    query = query.eq('buying_signal_strength', strength);
  } else {
    query = query.in('buying_signal_strength', ['hot', 'warm']);
  }

  // Route by rep unless admin: PH reps see PH leads, intl reps see non-PH.
  if (user.role !== 'admin') {
    const ph = ['bryan@numat.ph'].includes(user.email.toLowerCase());
    if (ph) {
      query = query.eq('country', 'Philippines');
    } else {
      query = query.neq('country', 'Philippines');
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Does each signal lead already have a draft? Surface that so reps do not
  // double-draft. One query for all lead ids.
  const ids = (data ?? []).map((l: { id: string }) => l.id);
  let draftedLeadIds = new Set<string>();
  if (ids.length > 0) {
    const { data: drafts } = await adminClient
      .from('email_drafts')
      .select('lead_id')
      .in('lead_id', ids);
    draftedLeadIds = new Set(
      (drafts ?? []).map((d: { lead_id: string | null }) => d.lead_id).filter(Boolean) as string[],
    );
  }

  const enriched = (data ?? []).map((l: { id: string }) => ({
    ...l,
    has_draft: draftedLeadIds.has(l.id),
  }));

  return NextResponse.json({ signals: enriched });
}
