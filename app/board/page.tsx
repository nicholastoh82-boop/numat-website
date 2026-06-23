import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import BoardLoginForm from '@/components/board-portal/BoardLoginForm'
import BoardDashboard from '@/components/board-portal/BoardDashboard'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Fixed rate, matches the CEO dashboard monthly reporting so the two stay in sync.
const FX_RATE = 60

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

async function getConfig(key: string): Promise<string | null> {
  const { data } = await sb().from('config_kv').select('value').eq('key', key).maybeSingle()
  const v = data ? (data as { value: unknown }).value : null
  return typeof v === 'string' ? v : null
}

type PaRow = { month: string; currency: string; booked_revenue: number; earned_revenue: number; cash_collected: number; cash_out: number; net_cash: number }

export default async function BoardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('board_session')?.value
  const sessionKey = await getConfig('board_portal_session_key')
  const authed = Boolean(sessionKey) && session === sessionKey
  if (!authed) return <BoardLoginForm />

  const client = sb()
  const [paRes, pipeRes, dealsRes] = await Promise.all([
    client.from('rpt_pa_monthly').select('*').gte('month', '2026-01-01').order('month', { ascending: true }),
    client.from('rpt_board_pipeline').select('*'),
    client.from('rpt_board_active_deals').select('*'),
  ])

  const pa = (paRes.data || []) as PaRow[]
  const months = Array.from(new Set(pa.map((r) => r.month))).sort()
  const rows = months.map((ym) => {
    const php = pa.find((r) => r.month === ym && r.currency === 'PHP')
    const usd = pa.find((r) => r.month === ym && r.currency === 'USD')
    const sgd = pa.find((r) => r.month === ym && r.currency === 'SGD')
    // Fold any non peso amounts into pesos at the fixed rate, exactly like the CEO view.
    const bookedPhp = php?.booked_revenue || 0
    const earnedPhp = php?.earned_revenue || 0
    const collectedPhp = php?.cash_collected || 0
    const cashOutPhp = (php?.cash_out || 0) + ((usd?.cash_out || 0) + (sgd?.cash_out || 0)) * FX_RATE
    const netPhp = collectedPhp - cashOutPhp
    return {
      month: ym,
      bookedPhp, bookedUsd: bookedPhp / FX_RATE,
      earnedPhp, earnedUsd: earnedPhp / FX_RATE,
      collectedPhp, collectedUsd: collectedPhp / FX_RATE,
      cashOutPhp, cashOutUsd: cashOutPhp / FX_RATE,
      netPhp, netUsd: netPhp / FX_RATE,
    }
  })

  return (
    <BoardDashboard
      months={rows}
      pipeline={(pipeRes.data || []) as { stage: string; leads: number }[]}
      deals={(dealsRes.data || []) as Record<string, unknown>[]}
      fxRate={FX_RATE}
    />
  )
}
