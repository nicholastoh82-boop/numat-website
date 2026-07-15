/*
  app/api/portal/payslips/generate/route.ts
  POST builds payslips for a month. People with a fixed salary (staff_salaries)
  get one Basic Salary line in their own currency, plus any bonus or reimbursement
  extras recorded for them that month (payslip_additions). Everyone else (weekly
  factory workers) gets their actual verified payouts as lines, with no extras.
  Only staff who were paid that month are included. The month is rebuilt cleanly
  each run. DELETE removes one payslip. Admin only.
*/

import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SALARY_CATEGORIES = [54, 55, 56]
const DEPARTMENT: Record<number, string> = { 54: 'Management', 55: 'Factory', 56: 'Operations' }
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
  return name.trim().split(/\s+/).slice(0, 3).map((w) => w[0]).join('').toUpperCase() || 'X'
}

type Txn = {
  staff_id: string | null
  currency: string | null
  transaction_date: string
  amount: number
  description: string | null
  category_id: number | null
}

type Addition = {
  staff_id: string
  kind: string
  description: string | null
  amount: number
  currency: string
}

export async function POST(req: NextRequest) {
  const me = await getPortalUser()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  if (!me.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { month } = await req.json()
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

  const { data: staffRows } = await a.from('fin_staff').select('id, name, role, email')
  const staffMap = new Map<string, { name: string; role: string | null; email: string | null }>()
  for (const s of (staffRows || []) as { id: string; name: string; role: string | null; email: string | null }[]) {
    staffMap.set(s.id, { name: s.name, role: s.role, email: s.email })
  }

  const { data: salaryRows } = await a.from('staff_salaries').select('staff_id, monthly_salary, currency')
  const salaryMap = new Map<string, { amount: number; currency: string }>()
  for (const r of (salaryRows || []) as { staff_id: string; monthly_salary: number; currency: string }[]) {
    salaryMap.set(r.staff_id, { amount: Number(r.monthly_salary), currency: r.currency })
  }

  // Extras (bonuses, reimbursements) recorded for this month, grouped per staff.
  const { data: addRows } = await a
    .from('payslip_additions')
    .select('staff_id, kind, description, amount, currency')
    .eq('period', period)
  const addByStaff = new Map<string, Addition[]>()
  for (const r of (addRows || []) as Addition[]) {
    const arr = addByStaff.get(r.staff_id) || []
    arr.push(r)
    addByStaff.set(r.staff_id, arr)
  }

  const { data: userList } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailToUser = new Map<string, string>()
  for (const u of userList?.users || []) {
    if (u.email) emailToUser.set(u.email.toLowerCase(), u.id)
  }

  // Group the month's payouts per staff (who was paid, their dates, categories).
  const perStaff = new Map<string, Txn[]>()
  for (const t of txns) {
    if (!t.staff_id) continue
    const arr = perStaff.get(t.staff_id) || []
    arr.push(t)
    perStaff.set(t.staff_id, arr)
  }

  if (perStaff.size === 0) {
    return NextResponse.json({ ok: true, count: 0, period_label: periodLabel })
  }

  const rows: Record<string, unknown>[] = []
  for (const [staffId, list] of perStaff.entries()) {
    const staff = staffMap.get(staffId)
    const name = staff?.name || 'Staff'
    const email = staff?.email ? staff.email.toLowerCase() : null
    const userId = email ? emailToUser.get(email) || null : null
    const cat = list.find((l) => l.category_id != null)?.category_id ?? null
    const department = cat != null ? DEPARTMENT[cat] || 'Operations' : 'Operations'
    const payDate = list.reduce((d, l) => (l.transaction_date > d ? l.transaction_date : d), list[0].transaction_date)
    const reference = `PS/${m[1]}/${m[2]}/${initials(name)}`

    const base = {
      staff_id: staffId,
      employee_name: name,
      employee_role: staff?.role || null,
      department,
      employee_email: email,
      user_id: userId,
      period,
      period_label: periodLabel,
      period_start: periodStart,
      period_end: periodEnd,
      reference_no: reference,
      generated_by: me.id,
      generated_by_email: me.email,
      updated_at: new Date().toISOString(),
    }

    const fixed = salaryMap.get(staffId)
    if (fixed) {
      // Fixed salary: Basic Salary, then any extras in the same currency.
      const earnings: { date: string; description: string; amount: number }[] = [
        { date: payDate, description: 'Basic Salary', amount: fixed.amount },
      ]
      let total = fixed.amount
      for (const ex of addByStaff.get(staffId) || []) {
        if ((ex.currency || '').toUpperCase() !== fixed.currency.toUpperCase()) continue
        const label = ex.description ? `${ex.kind}: ${ex.description}` : ex.kind
        const amt = Number(ex.amount || 0)
        earnings.push({ date: payDate, description: label, amount: amt })
        total += amt
      }
      rows.push({
        ...base,
        pay_date: payDate,
        currency: fixed.currency,
        earnings,
        gross: total,
        deductions: 0,
        net: total,
      })
    } else {
      // Variable: actual payouts, grouped by currency. Weekly payout only.
      const byCur = new Map<string, Txn[]>()
      for (const t of list) {
        const cur = (t.currency || 'PHP').toUpperCase()
        const arr = byCur.get(cur) || []
        arr.push(t)
        byCur.set(cur, arr)
      }
      for (const [cur, items] of byCur.entries()) {
        const gross = items.reduce((s, l) => s + Number(l.amount || 0), 0)
        const cPay = items.reduce((d, l) => (l.transaction_date > d ? l.transaction_date : d), items[0].transaction_date)
        rows.push({
          ...base,
          pay_date: cPay,
          currency: cur,
          earnings: items.map((l) => ({
            date: l.transaction_date,
            description: l.description || 'Salary',
            amount: Number(l.amount || 0),
          })),
          gross,
          deductions: 0,
          net: gross,
        })
      }
    }
  }

  // Rebuild the month cleanly so a change of data or logic leaves no stale rows.
  await a.from('staff_payslips').delete().eq('period', period)
  const { error } = await a.from('staff_payslips').insert(rows)
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
