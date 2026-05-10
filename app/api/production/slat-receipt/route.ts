import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const {
    event_date, supplier, slats_received, slats_passed, slats_rejected,
    reject_reason, notes, shift_operator,
    mc_avg, mc_min, mc_max,
    reject_cracks, reject_blue_stain, reject_insect, reject_undersized, reject_moisture, reject_other,
  } = body
  if (!event_date) return NextResponse.json({ error: 'event_date required' }, { status: 400 })
  const r = Number(slats_received), p = Number(slats_passed), j = Number(slats_rejected)
  if (!Number.isFinite(r) || r < 0) return NextResponse.json({ error: 'slats_received invalid' }, { status: 400 })
  if (p < 0 || j < 0 || p + j > r) return NextResponse.json({ error: 'passed + rejected cannot exceed received' }, { status: 400 })

  const num = (x: any) => x === null || x === undefined || x === '' ? null : Number(x)
  const intOr0 = (x: any) => Math.max(0, Math.floor(Number(x) || 0))

  const sc = adminClient()
  const { data, error } = await sc.from('prod_slat_receipts').insert({
    event_date, supplier: supplier || null,
    slats_received: r, slats_passed: p, slats_rejected: j,
    reject_reason: reject_reason || null, notes: notes || null,
    submitted_by: auth.email, shift_operator: shift_operator || null,
    mc_avg: num(mc_avg), mc_min: num(mc_min), mc_max: num(mc_max),
    reject_cracks: intOr0(reject_cracks), reject_blue_stain: intOr0(reject_blue_stain),
    reject_insect: intOr0(reject_insect), reject_undersized: intOr0(reject_undersized),
    reject_moisture: intOr0(reject_moisture), reject_other: intOr0(reject_other),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
