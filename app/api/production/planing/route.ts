import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const {
    event_date, station, slats_in, slats_out, defects, downtime_min, downtime_reason,
    notes, shift_operator,
    defect_cracks, defect_blue_stain, defect_dimensional, defect_other,
  } = body
  if (!event_date) return NextResponse.json({ error: 'event_date required' }, { status: 400 })
  if (!['rough', 'fine'].includes(station)) return NextResponse.json({ error: 'station must be rough or fine' }, { status: 400 })
  const sIn = Number(slats_in), sOut = Number(slats_out), d = Number(defects || 0), dt = Number(downtime_min || 0)
  if (sIn < 0 || sOut < 0 || d < 0 || sOut + d > sIn) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })

  const intOr0 = (x: any) => Math.max(0, Math.floor(Number(x) || 0))

  const sc = adminClient()
  const { data, error } = await sc.from('prod_planing_runs').insert({
    event_date, station, slats_in: sIn, slats_out: sOut, defects: d,
    downtime_min: dt, downtime_reason: downtime_reason || null, notes: notes || null,
    submitted_by: auth.email, shift_operator: shift_operator || null,
    defect_cracks: intOr0(defect_cracks), defect_blue_stain: intOr0(defect_blue_stain),
    defect_dimensional: intOr0(defect_dimensional), defect_other: intOr0(defect_other),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
