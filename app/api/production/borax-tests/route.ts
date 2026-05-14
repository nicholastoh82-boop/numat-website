import { NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const sc = adminClient()
  // Join in basic batch info (event_date + supplier + slats_received) so the UI can show context
  const { data, error } = await sc
    .from('prod_borax_tests')
    .select('id, slat_receipt_id, event_date, slats_pass, slats_fail, notes, shift_operator, submitted_by, submitted_at, voided, void_reason, prod_slat_receipts(event_date, supplier, slats_received, borax_test_status)')
    .order('submitted_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data || [] })
}
