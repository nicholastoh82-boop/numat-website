// app/api/admin/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuthUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null

  const { data: crmUser } = await supabase
    .from('crm_users')
    .select('name, rep_assigned_name')
    .eq('id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email,
    role: profile.role as 'admin' | 'rep',
    repName: crmUser?.rep_assigned_name ?? null,
    displayName: crmUser?.name ?? null,
  }
}

// ==============================================================================
// GET: List leads OR single lead
// ==============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const authUser = await getAuthUser(supabase)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const singleId = searchParams.get('id')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = 50
    const offset = (page - 1) * limit
    const search = searchParams.get('search') ?? ''
    const segment = searchParams.get('segment') ?? ''
    const status = searchParams.get('status') ?? ''
    const repFilter = searchParams.get('rep') ?? ''
    const stage = searchParams.get('stage') ?? ''

    // ── Single lead ──────────────────────────────────────────────────────────
    if (singleId) {
      let q = supabase.from('master_leads').select('*').eq('id', singleId)
      if (authUser.role === 'rep') {
        q = q.ilike('rep_assigned', authUser.repName ?? '')
      }
      const { data, error } = await q.maybeSingle()
      if (error) throw error
      return NextResponse.json(data)
    }

    // ── Lead list ────────────────────────────────────────────────────────────
    let q = supabase
      .from('master_leads')
      .select(
        `id, full_name, first_name, last_name, email, company, country,
         segment, status, pipeline_stage, rep_assigned,
         notes, last_activity_at, last_activity_type,
         email_1_sent, email_2_sent, email_3_sent, email_4_sent, email_5_sent,
         replied_at, appointment_date, booking_confirmed,
         report_sent, created_at, updated_at`,
        { count: 'exact' }
      )

    // Role-based rep filter
    if (authUser.role === 'rep') {
      q = q.ilike('rep_assigned', authUser.repName ?? '')
    } else if (repFilter) {
      q = q.ilike('rep_assigned', repFilter)
    }

    if (search) {
      q = q.or(
        `full_name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`
      )
    }
    if (segment) q = q.eq('segment', segment)
    if (status) q = q.eq('status', status)
    if (stage) q = q.eq('pipeline_stage', stage)

    q = q
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await q
    if (error) throw error

    return NextResponse.json({ leads: data ?? [], total: count ?? 0, page, limit })
  } catch (err) {
    console.error('[Leads GET]', err)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

// ==============================================================================
// PATCH: Update single lead OR bulk update (admin only)
// ==============================================================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const authUser = await getAuthUser(supabase)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, pipeline_stage, status, note, last_activity_type, bulk_ids, bulk_update } = body

    const formatDate = () =>
      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

    const appendNote = (existing: string | null, newNote: string) => {
      const stamp = `[${formatDate()}] ${newNote.trim()}`
      return existing ? `${existing}\n${stamp}` : stamp
    }

    // ── Bulk update (admin only) ─────────────────────────────────────────────
    if (bulk_ids && bulk_update) {
      if (authUser.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!Array.isArray(bulk_ids) || bulk_ids.length === 0) {
        return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
      }
      const { error } = await supabase
        .from('master_leads')
        .update({ ...bulk_update, updated_at: new Date().toISOString() })
        .in('id', bulk_ids)
      if (error) throw error
      return NextResponse.json({ ok: true, updated: bulk_ids.length })
    }

    // ── Single lead update ────────────────────────────────────────────────────
    if (!id) return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })

    const { data: lead, error: fetchErr } = await supabase
      .from('master_leads')
      .select('rep_assigned, notes')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // Reps can only update leads assigned to them
    if (authUser.role === 'rep') {
      if (lead.rep_assigned?.toLowerCase() !== authUser.repName?.toLowerCase()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    }
    if (pipeline_stage !== undefined) updates.pipeline_stage = pipeline_stage
    if (status !== undefined) updates.status = status
    if (last_activity_type) updates.last_activity_type = last_activity_type
    if (note?.trim()) updates.notes = appendNote(lead.notes, note)

    const { error } = await supabase.from('master_leads').update(updates).eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Leads PATCH]', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}