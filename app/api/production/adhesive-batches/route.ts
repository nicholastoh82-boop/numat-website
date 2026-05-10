import { NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const sc = adminClient()
  // Last 60 days, not voided. Most recent first.
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await sc.from('prod_adhesive_batches')
    .select('id, batch_label, adhesive_type, mix_datetime, mix_ratio, mixed_by')
    .eq('voided', false)
    .gte('mix_datetime', cutoff)
    .order('mix_datetime', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ batches: data || [] })
}
