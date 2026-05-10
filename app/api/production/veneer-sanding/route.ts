import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const { event_date, veneers_in, veneers_passed, defects, notes } = body
  if (!event_date) return NextResponse.json({ error: 'event_date required' }, { status: 400 })
  const i = Number(veneers_in), p = Number(veneers_passed), d = Number(defects || 0)
  if (i < 0 || p < 0 || d < 0 || p + d > i) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })
  const sc = adminClient()
  const { data, error } = await sc.from('prod_veneer_sanding').insert({
    event_date, veneers_in: i, veneers_passed: p, defects: d,
    notes: notes || null, submitted_by: auth.email,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
