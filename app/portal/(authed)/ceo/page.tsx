/* app/portal/(authed)/ceo/page.tsx
   Server component. Auth via Supabase + role check (admin or ceo only).
   Reads period from query params and forwards to the edge function. */

import { requireFeature } from '@/lib/portal/roles'
import CeoDashboard from './_components/CeoDashboard'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const metadata = {
  title: 'CEO Dashboard | NUMAT Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EDGE_URL =
  'https://peuwxnrojlfybdymkazj.supabase.co/functions/v1/ceo-dashboard'

type SearchParams = {
  period?: string
  from?: string
  to?: string
}

async function loadCeoData(params: SearchParams): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const secret = process.env.NUMAT_CEO_SECRET
  if (!secret) {
    return { ok: false, error: 'Server configuration missing: NUMAT_CEO_SECRET not set in environment.' }
  }
  const qs = new URLSearchParams()
  if (params.period) qs.set('period', params.period)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  const url = qs.toString() ? `${EDGE_URL}?${qs}` : EDGE_URL

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Edge function returned ${res.status}: ${text.slice(0, 200)}` }
    }
    const data = await res.json()
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, error: `Failed to fetch dashboard data: ${e?.message || 'unknown error'}` }
  }
}

// Fixed rate for the monthly reporting table, as requested. One source of truth:
// the rpt_pa_monthly view in the same Supabase the rest of the dashboard uses.
const FX_RATE = 60

async function loadMonthly(): Promise<any[]> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const admin = createAdmin(url, key, { auth: { persistSession: false } })

  // Last 12 calendar months.
  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)
  const sinceStr = since.toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('rpt_pa_monthly')
    .select('month,currency,booked_revenue,earned_revenue,cash_collected,cash_out,net_cash')
    .gte('month', sinceStr)
    .order('month', { ascending: true })
  if (error || !data) return []

  // Combine the per currency rows into one PHP total per month. Amounts not in
  // PHP are folded in at the fixed rate. The view already limits cash received
  // for sales to customer income, so capital is excluded.
  const byMonth = new Map<string, any>()
  for (const row of data as any[]) {
    const factor = row.currency === 'PHP' ? 1 : FX_RATE
    const cur = byMonth.get(row.month) || { month: row.month, booked: 0, earned: 0, collected: 0, cashout: 0, net: 0 }
    cur.booked += Number(row.booked_revenue || 0) * factor
    cur.earned += Number(row.earned_revenue || 0) * factor
    cur.collected += Number(row.cash_collected || 0) * factor
    cur.cashout += Number(row.cash_out || 0) * factor
    cur.net = cur.collected - cur.cashout
    byMonth.set(row.month, cur)
  }
  // Most recent month first.
  return Array.from(byMonth.values()).sort((a, b) => (a.month < b.month ? 1 : -1))
}

async function loadCashAtBank(): Promise<{ usd_total: number; accounts: any[] }> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { usd_total: 0, accounts: [] }
  const admin = createAdmin(url, key, { auth: { persistSession: false } })
  // Bank accounts only. The revolving fund is petty cash, not cash at bank.
  const { data, error } = await admin
    .from('fin_account_balances')
    .select('name,currency,current_balance,account_type')
    .eq('account_type', 'bank')
  if (error || !data) return { usd_total: 0, accounts: [] }
  const accounts = (data as any[])
    .map((a) => {
      const bal = Number(a.current_balance || 0)
      const usd = a.currency === 'PHP' ? bal / FX_RATE : bal
      return { name: a.name, currency: a.currency, balance: bal, usd }
    })
    .sort((x, y) => y.usd - x.usd)
  const usd_total = accounts.reduce((s, a) => s + a.usd, 0)
  return { usd_total, accounts }
}

// Per rep email KPIs come from the v_rep_email_kpis view (CRM email activity in
// crm_emails). The view already computes every column and sorts active reps
// first, so we only read it here, the same way the other server side loaders
// read their views. This is deliberately not the sequence_events based tracking.
async function loadRepEmailKpis(): Promise<any[]> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  const admin = createAdmin(url, key, { auth: { persistSession: false } })
  const { data, error } = await admin
    .from('v_rep_email_kpis')
    .select(
      'rep_email,rep_name,rep_active,total_sent,sent_24h,sent_7d,sent_30d,leads_contacted,total_received,received_7d,leads_replied,reply_rate_pct,last_sent_at',
    )
    .order('rep_active', { ascending: false })
    .order('total_sent', { ascending: false })
  if (error || !data) return []
  return data as any[]
}

export default async function CeoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireFeature('ceo')
  const params = await searchParams
  const [result, paMonthly, cashAtBank, repEmailKpis] = await Promise.all([
    loadCeoData(params),
    loadMonthly(),
    loadCashAtBank(),
    loadRepEmailKpis(),
  ])

  if (!result.ok) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900 mb-2">Could not load CEO dashboard</h1>
        <p className="text-sm text-red-800 whitespace-pre-wrap">{result.error}</p>
      </div>
    )
  }

  return <CeoDashboard data={{ ...result.data, pa_monthly: paMonthly, cash_at_bank: cashAtBank, rep_email_kpis: repEmailKpis }} />
}
