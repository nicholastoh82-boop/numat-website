/*
  app/api/portal/payslips/generate/route.ts
  POST builds payslips for a month from verified salary payouts in
  fin_transactions, one per staff per currency, with the tranche breakdown.
  DELETE removes one payslip. Admin only.
*/

import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Management, Factory, Others salary. Advances and reversals are excluded by
// the entry_type and status filters below.
const SALARY_CATEGORIES = [54, 55, 56]
const DEPARTMENT: Record<number, string> = {
  54: 'Management',
  55: 'Factory',
  56: 'Operations',
}
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'X'
  )
}

type Txn = {
  staff_id: string | null
  currency: string | null
  transaction_date: string
  amount: number
  description: string | null
  category_id: number | null
}

export async function POST(req: NextRequest) {
  const me = await getPortalUser()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  if (!me.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { month } = await req.json() // 'YYYY-MM'
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ''))
  if (!m) return NextResponse.json({ error: 'Pick a month.' }, { status: 400 })
  const year = Number(m[1])
  const mon = Number(m[2])
  if (mon < 1 || mon > 12) return NextResponse.json({ error: 'Bad month.' }, { status: 400 })

  const periodStart = `${m[1]}-${m[2]}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const periodEnd = `${m[1]}-${m[2]}-${String(lastDay).padStart(2, '0')}`
  const periodLabel = `${MONTHS[mon - 1]} ${year}`
  const period = `${m[1]}-${m[2]}`

  const a = adminClient()

  const { data: txnData, error: txnErr } = await a
    .from('fin_transactions')
    .select('staff_id, currency, transaction_date, amount, description, category_id')
    .in('category_id', SALARY_CATEGORIES)
    .eq('entry_type', 'salary')
    .eq('status', 'verified')
    .gte('transaction_date', periodStart)
    .lte('transaction_date', periodEnd)
    .order('transaction_date', { ascending: true })
  if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 500 })
  const txns = (txnData ?? []) as Txn[]

  // Staff master and portal user mapping.
  const { data: staffRows } = await a.from('fin_staff').select('id, name, role, email')
  const staffMap = new Map<string, { name: string; role: string | null; email: string | null }>()
  for (const s of (staffRows || []) as { id: string; name: string; role: string | null; email: string | null }[]) {
    staffMap.set(s.id, { name: s.name, role: s.role, email: s.email })
  }

  const { data: userList } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailToUser = new Map<string, string>()
  for (const u of userList?.users || []) {
    if (u.email) emailToUser.set(u.email.toLowerCase(), u.id)
  }

  // Group by staff and currency.
  type Group = { staff_id: string; currency: string; lines: Txn[]; categories: number[] }
  const groups = new Map<string, Group>()
  for (const t of txns) {
    if (!t.staff_id) continue
    const cur = (t.currency || 'PHP').toUpperCase()
    const key = `${t.staff_id}|${cur}`
    const g = groups.get(key) || { staff_id: t.staff_id, currency: cur, lines: [], categories: [] }
    g.lines.push(t)
    if (t.category_id != null) g.categories.push(t.category_id)
    groups.set(key, g)
  }

  if (groups.size === 0) {
    return NextResponse.json({ ok: true, count: 0, period_label: periodLabel })
  }

  const rows = Array.from(groups.values()).map((g) => {
    const staff = staffMap.get(g.staff_id)
    const name = staff?.name || 'Staff'
    const email = staff?.email ? staff.email.toLowerCase() : null
    const gross = g.lines.reduce((s, l) => s + Number(l.amount || 0), 0)
    const payDate = g.lines.reduce((d, l) => (l.transaction_date > d ? l.transaction_date : d), g.lines[0].transaction_date)
    const cat = g.categories[0]
    return {
      staff_id: g.staff_id,
      employee_name: name,
      employee_role: staff?.role || null,
      department: cat != null ? DEPARTMENT[cat] || 'Operations' : 'Operations',
      employee_email: email,
      user_id: email ? emailToUser.get(email) || null : null,
      period,
      period_label: periodLabel,
      period_start: periodStart,
      period_end: periodEnd,
      pay_date: payDate,
      reference_no: `PS/${m[1]}/${m[2]}/${initials(name)}`,
      currency: g.currency,
      earnings: g.lines.map((l) => ({
        date: l.transaction_date,
        description: l.description || 'Salary',
        amount: Number(l.amount || 0),
      })),
      gross,
      deductions: 0,
      net: gross,
      generated_by: me.id,
      generated_by_email: me.email,
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await a
    .from('staff_payslips')
    .upsert(rows, { onConflict: 'staff_id,period,currency' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: rows.length, period_label: periodLabel })
}

export async function DELETE(req: NextRequest) {
  const me = await getPortalUser()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  if (!me.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const a = adminClient()
  await a.from('staff_payslips').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
