// app/api/admin/pipeline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuthUser(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) return null
  const { data: crmUser } = await supabase
    .from('crm_users')
    .select('rep_assigned_name')
    .eq('id', user.id)
    .maybeSingle()
  return { role: profile.role as 'admin' | 'rep', repName: crmUser?.rep_assigned_name ?? null }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const authUser = await getAuthUser(supabase)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── By Stage ─────────────────────────────────────────────────────────────
    let stageQuery = supabase.from('v_pipeline_by_stage').select('*')
    const { data: byStage } = await stageQuery

    // ── By Segment ────────────────────────────────────────────────────────────
    const { data: bySegment } = await supabase.from('v_pipeline_by_segment').select('*')

    // ── By Rep ────────────────────────────────────────────────────────────────
    // Derive from master_leads since v_pipeline_by_rep may not exist
    const { data: repRaw } = await supabase
      .from('master_leads')
      .select('rep_assigned, pipeline_stage')
      .not('rep_assigned', 'is', null)

    type RepAgg = { rep: string; deal_count: number; won_count: number; total_value_usd: null }
    const repMap = new Map<string, RepAgg>()
    for (const row of repRaw ?? []) {
      const key = row.rep_assigned as string
      if (!repMap.has(key)) repMap.set(key, { rep: key, deal_count: 0, won_count: 0, total_value_usd: null })
      const entry = repMap.get(key)!
      entry.deal_count++
      if (row.pipeline_stage === 'Won') entry.won_count++
    }
    const byRep = Array.from(repMap.values())

    // ── Rep personal summary (if rep role) ───────────────────────────────────
    let repSummary = null
    if (authUser.role === 'rep' && authUser.repName) {
      const { data: repLeads } = await supabase
        .from('master_leads')
        .select('status, pipeline_stage, replied_at, appointment_date')
        .ilike('rep_assigned', authUser.repName)

      repSummary = {
        total: repLeads?.length ?? 0,
        replied: repLeads?.filter(l => l.replied_at).length ?? 0,
        meetings: repLeads?.filter(l => l.appointment_date || l.pipeline_stage === 'Meeting Booked').length ?? 0,
        won: repLeads?.filter(l => l.pipeline_stage === 'Won').length ?? 0,
      }
    }

    return NextResponse.json({ byStage: byStage ?? [], bySegment: bySegment ?? [], byRep, repSummary })
  } catch (err) {
    console.error('[Pipeline GET]', err)
    return NextResponse.json({ error: 'Failed to fetch pipeline data' }, { status: 500 })
  }
}