import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import BoardLoginForm from '@/components/board-portal/BoardLoginForm'
import BoardDashboard from '@/components/board-portal/BoardDashboard'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SGD_USD = 0.74

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

async function getConfig(key: string): Promise<string | null> {
  const { data } = await sb().from('config_kv').select('value').eq('key', key).maybeSingle()
  const v = data ? (data as { value: unknown }).value : null
  return typeof v === 'string' ? v : null
}

type PaRow = { month: string; currency: string; booked_revenue: number; earned_revenue: number; cash_collected: number; cash_out: number; net_cash: number }
type FxRow = { year: number; month: number; avg_rate: number }

export default async function BoardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('board_session')?.value
  const sessionKey = await getConfig('board_portal_session_key')
  const authed = Boolean(sessionKey) && session === sessionKey
  if (!authed) return <BoardLoginForm />

  const client = sb()
  const [paRes, fxRes, pipeRes, dealsRes] = await Promise.all([
    client.from('rpt_pa_monthly').select('*').gte('month', '2026-01-01').order('month', { ascending: true }),
    client.from('fin_fx_rates_monthly').select('year, month, avg_rate').order('year', { ascending: false }).order('month', { ascending: false }),
    client.from('rpt_board_pipeline').select('*'),
    client.from('rpt_board_active_deals').select('*'),
  ])

  const pa = (paRes.data || []) as PaRow[]
  const fx = (fxRes.data || []) as FxRow[]
  const latestRate = fx.length ? Number(fx[0].avg_rate) : 58.5
  const rateFor = (ym: string) => {
    const [y, m] = ym.split('-').map(Number)
    const hit = fx.find((r) => r.year === y && r.month === m)
    return hit ? Number(hit.avg_rate) : latestRate
  }

  const months = Array.from(new Set(pa.map((r) => r.month))).sort()
  const rows = months.map((ym) => {
    const php = pa.find((r) => r.month === ym && r.currency === 'PHP')
    const usd = pa.find((r) => r.month === ym && r.currency === 'USD')
    const sgd = pa.find((r) => r.month === ym && r.currency === 'SGD')
    const rate = rateFor(ym)
    const bookedPhp = php?.booked_revenue || 0
    const earnedPhp = php?.earned_revenue || 0
    const collectedPhp = php?.cash_collected || 0
    const collectedUsd = collectedPhp / rate
    const cashOutUsd = (php?.cash_out || 0) / rate + (usd?.cash_out || 0) + (sgd?.cash_out || 0) * SGD_USD
    return {
      month: ym, rate,
      bookedPhp, bookedUsd: bookedPhp / rate,
      earnedPhp, earnedUsd: earnedPhp / rate,
      collectedPhp, collectedUsd,
      cashOutUsd, netUsd: collectedUsd - cashOutUsd,
    }
  })

  return (
    <BoardDashboard
      months={rows}
      pipeline={(pipeRes.data || []) as { stage: string; leads: number }[]}
      deals={(dealsRes.data || []) as Record<string, unknown>[]}
      latestRate={latestRate}
    />
  )
}
