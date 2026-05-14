import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TABLES = new Set([
  'prod_slat_receipts', 'prod_planing_runs', 'prod_gluing_runs',
  'prod_veneer_sanding', 'prod_board_runs', 'prod_borax_tests',
])

export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const { table, row_id, reason } = body
  if (!ALLOWED_TABLES.has(table) || !row_id || !reason) return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  const sc = adminClient()
  const { error } = await sc.from(table).update({
    voided: true, void_reason: reason, voided_by: auth.email, voided_at: new Date().toISOString(),
  }).eq('id', row_id).eq('voided', false)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
