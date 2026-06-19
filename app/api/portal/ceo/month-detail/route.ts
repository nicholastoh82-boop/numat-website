/* app/api/portal/ceo/month-detail/route.ts
   Returns the line items behind each Monthly reporting figure for one month.
   Gated to admin or ceo. Reads the same Supabase the dashboard uses, through
   the service role. The filters match the rpt_pa_monthly view exactly, so the
   detail reconciles with the totals. */

import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CASHOUT_TYPES = ['expense', 'salary', 'bank_charge', 'liquidation', 'withholding_tax', 'salary_advance', 'other']

function admin() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  const user = await getPortalUser()
  if (!user || !(user.isAdmin || user.features.includes('ceo'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const month = req.nextUrl.searchParams.get('month') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'bad month' }, { status: 400 })
  }
  const start = new Date(month + 'T00:00:00')
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)

  const db = admin()

  const [bookedRes, earnedRes, collectedRes, cashoutRes, catRes] = await Promise.all([
    db.from('accounts_receivable')
      .select('invoice_number,customer,invoice_date,invoice_value,outstanding_amount,due_date,status,currency')
      .gte('invoice_date', startStr).lt('invoice_date', endStr)
      .order('invoice_date', { ascending: true }),
    db.from('deliveries')
      .select('delivery_date,customer,product,qty,unit,delivered_value,invoice_number,currency')
      .gte('delivery_date', startStr).lt('delivery_date', endStr)
      .order('delivery_date', { ascending: true }),
    db.from('fin_transactions')
      .select('transaction_date,amount,currency,vendor_payee,description')
      .gte('transaction_date', startStr).lt('transaction_date', endStr)
      .neq('status', 'reversed').eq('entry_type', 'income').eq('revenue_class', 'customer')
      .order('transaction_date', { ascending: true }),
    db.from('fin_transactions')
      .select('amount,currency,entry_type,category_id')
      .gte('transaction_date', startStr).lt('transaction_date', endStr)
      .neq('status', 'reversed').in('entry_type', CASHOUT_TYPES),
    db.from('fin_categories').select('id,name'),
  ])

  // Cash out grouped by category, so it is easy to see what is being paid out.
  // Category name where set, otherwise the transaction type. Foreign amounts are
  // folded into PHP at the fixed rate so the breakdown matches the summary total.
  const catName = new Map<number, string>()
  for (const c of (catRes.data || []) as any[]) catName.set(c.id, c.name)
  const pretty = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
  const groups = new Map<string, { category: string; count: number; total_php: number }>()
  for (const r of (cashoutRes.data || []) as any[]) {
    const named = r.category_id != null ? catName.get(r.category_id) : undefined
    const key = named || pretty(r.entry_type)
    const factor = r.currency === 'PHP' ? 1 : 60
    const g = groups.get(key) || { category: key, count: 0, total_php: 0 }
    g.count += 1
    g.total_php += Number(r.amount || 0) * factor
    groups.set(key, g)
  }
  const cashout = Array.from(groups.values()).sort((a, b) => b.total_php - a.total_php)

  return NextResponse.json({
    booked: bookedRes.data || [],
    earned: earnedRes.data || [],
    collected: collectedRes.data || [],
    cashout,
  })
}
