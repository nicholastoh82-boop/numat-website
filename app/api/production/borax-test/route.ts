import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const { slat_receipt_id, event_date, slats_pass, slats_fail, notes, shift_operator } = body

  if (!slat_receipt_id) return NextResponse.json({ error: 'slat_receipt_id required' }, { status: 400 })
  if (!event_date) return NextResponse.json({ error: 'event_date required' }, { status: 400 })
  const p = Number(slats_pass), f = Number(slats_fail)
  if (!Number.isFinite(p) || !Number.isFinite(f) || p < 0 || f < 0) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })
  if (p + f === 0) return NextResponse.json({ error: 'at least one slat must be tested' }, { status: 400 })

  const sc = adminClient()

  // Sanity check: the referenced receipt must exist and not be voided
  const { data: receipt, error: rcErr } = await sc.from('prod_slat_receipts')
    .select('id, slats_passed, voided').eq('id', slat_receipt_id).single()
  if (rcErr || !receipt) return NextResponse.json({ error: 'slat receipt not found' }, { status: 404 })
  if (receipt.voided) return NextResponse.json({ error: 'cannot test a voided receipt' }, { status: 400 })

  const { data, error } = await sc.from('prod_borax_tests').insert({
    slat_receipt_id, event_date,
    slats_pass: p, slats_fail: f,
    notes: notes || null, shift_operator: shift_operator || null,
    submitted_by: auth.email,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
