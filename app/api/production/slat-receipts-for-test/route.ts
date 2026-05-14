import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Returns recent slat receipts that can be tested. We include all
// not_tested batches plus the last 14 days regardless of status (so
// they can still log a follow-up test against an already-flagged batch).
export async function GET(_req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const sc = adminClient()
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data, error } = await sc
    .from('prod_slat_receipts')
    .select('id, event_date, supplier, slats_received, slats_passed, borax_test_status')
    .eq('voided', false)
    .or(`borax_test_status.eq.not_tested,event_date.gte.${cutoff}`)
    .order('event_date', { ascending: false })
    .limit(30)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data || [] })
}
