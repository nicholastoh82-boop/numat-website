import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const { event_date, variant_id, sku_snapshot, ply_count, veneers_consumed, boards_produced, boards_passed, defects, downtime_min, downtime_reason, notes } = body
  if (!event_date || !variant_id || !sku_snapshot || !ply_count) return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  const v = Number(veneers_consumed), bp = Number(boards_produced), bpa = Number(boards_passed), d = Number(defects || 0), dt = Number(downtime_min || 0)
  if (v < 0 || bp < 0 || bpa < 0 || d < 0 || bpa + d > bp) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })
  const sc = adminClient()
  const { data, error } = await sc.from('prod_board_runs').insert({
    event_date, variant_id, sku_snapshot, ply_count: Number(ply_count),
    veneers_consumed: v, boards_produced: bp, boards_passed: bpa, defects: d,
    downtime_min: dt, downtime_reason: downtime_reason || null, notes: notes || null,
    submitted_by: auth.email,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
