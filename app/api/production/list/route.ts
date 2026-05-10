import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TABLE_MAP: Record<string, string> = {
  slats: 'prod_slat_receipts',
  planing: 'prod_planing_runs',
  gluing: 'prod_gluing_runs',
  veneer_sanding: 'prod_veneer_sanding',
  boards: 'prod_board_runs',
}

export async function GET(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const station = req.nextUrl.searchParams.get('station') || ''
  const limit = Math.min(50, Number(req.nextUrl.searchParams.get('limit')) || 5)
  const table = TABLE_MAP[station]
  if (!table) return NextResponse.json({ error: 'invalid station' }, { status: 400 })
  const sc = adminClient()
  const { data, error } = await sc.from(table).select('*').order('event_date', { ascending: false }).order('submitted_at', { ascending: false }).limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data || [] })
}
