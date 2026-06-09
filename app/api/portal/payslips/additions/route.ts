/*
  app/api/portal/payslips/additions/route.ts
  Admin only. Manages one off extras (bonuses, reimbursements) for a management
  payslip. GET lists extras for a month. POST adds one. DELETE removes one. The
  extras only appear on a payslip after that month is generated again.
*/

import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const KINDS = ['Bonus', 'Reimbursement', 'Allowance', 'Other']

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  const me = await getPortalUser()
  if (!me || !me.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const period = req.nextUrl.searchParams.get('period') || ''
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: 'Bad period' }, { status: 400 })
  const a = adminClient()
  const { data } = await a
    .from('payslip_additions')
    .select('id, staff_id, kind, description, amount, currency')
    .eq('period', period)
    .order('created_at', { ascending: false })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const me = await getPortalUser()
  if (!me || !me.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const staff_id = String(body.staff_id || '')
  const period = String(body.period || '')
  const kind = String(body.kind || '')
  const currency = String(body.currency || '').toUpperCase()
  const description = body.description ? String(body.description) : null
  const amount = Number(body.amount)

  if (!staff_id) return NextResponse.json({ error: 'Pick a person.' }, { status: 400 })
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: 'Pick a month.' }, { status: 400 })
  if (!KINDS.includes(kind)) return NextResponse.json({ error: 'Pick a type.' }, { status: 400 })
  if (!currency) return NextResponse.json({ error: 'Currency is needed.' }, { status: 400 })
  if (!Number.isFinite(amount) || amount === 0) return NextResponse.json({ error: 'Enter an amount.' }, { status: 400 })

  const a = adminClient()
  const { error } = await a.from('payslip_additions').insert({
    staff_id, period, kind, description, amount, currency,
    created_by: me.id, created_by_email: me.email,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const me = await getPortalUser()
  if (!me || !me.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const a = adminClient()
  await a.from('payslip_additions').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
