import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Link from 'next/link'

export const metadata = { title: 'Rep Scoreboard', robots: 'noindex, nofollow' }
export const dynamic = 'force-dynamic'

type Row = {
  rep_email: string
  new_leads: number
  inbound_leads: number
  active_pipeline: number
  touched: number
  replies: number
  activities: number
  stale: number
  won: number
}

const REP_NAMES: Record<string, string> = {
  'erica@numat.ph': 'Erica',
  'bryan@numat.ph': 'Bryan',
  'janna@numat.ph': 'Janna',
  'lionel@numat.ph': 'Lionel',
  'nick@numat.ph': 'Nick',
}

function repName(email: string) {
  return REP_NAMES[email.toLowerCase()] || email.split('@')[0]
}

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

export default async function ScoreboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const sp = await searchParams
  const period = [7, 30, 90].includes(Number(sp.period)) ? Number(sp.period) : 30

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const sinceIso = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: rows }, { count: waClicks }, { data: inboundRows }] = await Promise.all([
    admin.rpc('crm_rep_scoreboard', { period_days: period }),
    admin.from('whatsapp_clicks').select('*', { count: 'exact', head: true }).gte('created_at', sinceIso),
    admin
      .from('master_leads')
      .select('source_type')
      .like('source_type', 'inbound_%')
      .gte('created_at', sinceIso),
  ])

  const scoreboard: Row[] = (rows as Row[]) || []
  const inboundBySource = new Map<string, number>()
  for (const r of (inboundRows as Array<{ source_type: string }>) || []) {
    inboundBySource.set(r.source_type, (inboundBySource.get(r.source_type) || 0) + 1)
  }
  const inboundTotal = Array.from(inboundBySource.values()).reduce((a, b) => a + b, 0)

  const cols: Array<{ key: keyof Row; label: string; hint: string }> = [
    { key: 'new_leads', label: 'New', hint: 'Leads assigned in the period' },
    { key: 'inbound_leads', label: 'Inbound', hint: 'Of those, from website inbound' },
    { key: 'active_pipeline', label: 'Active', hint: 'Open leads in a working stage now' },
    { key: 'touched', label: 'Touched', hint: 'Leads the rep engaged in the period' },
    { key: 'replies', label: 'Replies', hint: 'Leads that replied in the period' },
    { key: 'activities', label: 'Actions', hint: 'Activities the rep logged in the period' },
    { key: 'won', label: 'Won', hint: 'Marked won in the period' },
    { key: 'stale', label: 'Stale', hint: 'Active leads with no activity in 14 days' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 bg-white text-gray-900">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Rep Scoreboard</h1>
          <p className="mt-1 text-sm text-gray-500">Sales productivity over the last {period} days.</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={`/crm/scoreboard?period=${p.days}`}
              className={`px-3 py-1.5 rounded text-sm ${
                period === p.days ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Inbound funnel summary */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded border border-gray-200 p-4">
          <div className="text-2xl font-semibold">{waClicks ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">WhatsApp clicks</div>
        </div>
        <div className="rounded border border-gray-200 p-4">
          <div className="text-2xl font-semibold">{inboundTotal}</div>
          <div className="text-xs text-gray-500 mt-1">Inbound leads</div>
        </div>
        {(['inbound_quote', 'inbound_whatsapp'] as const).map((s) => (
          <div key={s} className="rounded border border-gray-200 p-4">
            <div className="text-2xl font-semibold">{inboundBySource.get(s) || 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              {s === 'inbound_quote' ? 'From quotes' : 'From WhatsApp'}
            </div>
          </div>
        ))}
      </div>

      {/* Per rep table */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900 text-left">
              <th className="py-2 pr-4 font-semibold">Rep</th>
              {cols.map((c) => (
                <th key={c.key} className="py-2 px-3 text-right font-semibold" title={c.hint}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scoreboard.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="py-6 text-center text-gray-400">
                  No data for this period.
                </td>
              </tr>
            )}
            {scoreboard.map((row) => (
              <tr key={row.rep_email} className="border-b border-gray-100">
                <td className="py-2.5 pr-4 font-medium">{repName(row.rep_email)}</td>
                {cols.map((c) => {
                  const v = Number(row[c.key] || 0)
                  const warn = c.key === 'stale' && v > 0
                  return (
                    <td
                      key={c.key}
                      className={`py-2.5 px-3 text-right tabular-nums ${
                        warn ? 'text-amber-600 font-medium' : 'text-gray-800'
                      }`}
                    >
                      {v}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        New, Inbound, Touched, Replies, Actions, and Won count the selected period. Active and Stale
        are current snapshots. Inbound figures fill in as website leads flow through the new tracking.
      </p>
    </div>
  )
}
