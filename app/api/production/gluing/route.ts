import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const {
    event_date, slats_consumed, veneers_produced, downtime_min, downtime_reason,
    notes, shift_operator, adhesive_batch_id,
    pre_press_mc_avg, spread_rate_g_m2,
    defect_bond_fail, defect_blowout, defect_other,
  } = body
  if (!event_date) return NextResponse.json({ error: 'event_date required' }, { status: 400 })
  if (!adhesive_batch_id) return NextResponse.json({ error: 'adhesive_batch_id required (mix or pick a batch first)' }, { status: 400 })
  const s = Number(slats_consumed), v = Number(veneers_produced), dt = Number(downtime_min || 0)
  if (s < 0 || v < 0) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })

  const num = (x: any) => x === null || x === undefined || x === '' ? null : Number(x)
  const intOr0 = (x: any) => Math.max(0, Math.floor(Number(x) || 0))

  const sc = adminClient()
  const { data, error } = await sc.from('prod_gluing_runs').insert({
    event_date, slats_consumed: s, veneers_produced: v, downtime_min: dt,
    downtime_reason: downtime_reason || null, notes: notes || null,
    submitted_by: auth.email, shift_operator: shift_operator || null,
    adhesive_batch_id, pre_press_mc_avg: num(pre_press_mc_avg), spread_rate_g_m2: num(spread_rate_g_m2),
    defect_bond_fail: intOr0(defect_bond_fail), defect_blowout: intOr0(defect_blowout), defect_other: intOr0(defect_other),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
