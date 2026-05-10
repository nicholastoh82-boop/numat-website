import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const { batch_label, adhesive_type, mix_datetime, mix_ratio, ambient_temp_c, ambient_rh_pct, mixed_by, notes } = body
  if (!batch_label || !adhesive_type || !mix_datetime || !mixed_by) {
    return NextResponse.json({ error: 'batch_label, adhesive_type, mix_datetime, mixed_by required' }, { status: 400 })
  }
  if (!['PRF_R22_017', 'PF_R22_012', 'LoFoUF_R21_036'].includes(adhesive_type)) {
    return NextResponse.json({ error: 'invalid adhesive_type' }, { status: 400 })
  }
  const sc = adminClient()
  const { data, error } = await sc.from('prod_adhesive_batches').insert({
    batch_label, adhesive_type, mix_datetime,
    mix_ratio: mix_ratio || null,
    ambient_temp_c: ambient_temp_c || null,
    ambient_rh_pct: ambient_rh_pct || null,
    mixed_by, notes: notes || null,
    submitted_by: auth.email,
  }).select('id, batch_label, adhesive_type, mix_datetime').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ batch: data })
}
