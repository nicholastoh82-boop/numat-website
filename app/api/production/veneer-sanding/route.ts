import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const {
    event_date, veneers_in, veneers_passed, defects, notes, shift_operator,
    defect_surface, defect_dimensional, defect_glue_bleed, defect_other,
  } = body
  if (!event_date) return NextResponse.json({ error: 'event_date required' }, { status: 400 })
  const i = Number(veneers_in), p = Number(veneers_passed), d = Number(defects || 0)
  if (i < 0 || p < 0 || d < 0 || p + d > i) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })

  const intOr0 = (x: any) => Math.max(0, Math.floor(Number(x) || 0))

  const sc = adminClient()
  const { data, error } = await sc.from('prod_veneer_sanding').insert({
    event_date, veneers_in: i, veneers_passed: p, defects: d,
    notes: notes || null, submitted_by: auth.email, shift_operator: shift_operator || null,
    defect_surface: intOr0(defect_surface), defect_dimensional: intOr0(defect_dimensional),
    defect_glue_bleed: intOr0(defect_glue_bleed), defect_other: intOr0(defect_other),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
