import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const { event_date, slats_consumed, veneers_produced, downtime_min, downtime_reason, notes } = body
  if (!event_date) return NextResponse.json({ error: 'event_date required' }, { status: 400 })
  const s = Number(slats_consumed), v = Number(veneers_produced), dt = Number(downtime_min || 0)
  if (s < 0 || v < 0) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })
  const sc = adminClient()
  const { data, error } = await sc.from('prod_gluing_runs').insert({
    event_date, slats_consumed: s, veneers_produced: v, downtime_min: dt,
    downtime_reason: downtime_reason || null, notes: notes || null, submitted_by: auth.email,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
