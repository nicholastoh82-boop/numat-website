/* app/portal/(authed)/scoreboard/page.tsx
   NuBam Hybrid scoreboard. Server component.
   Visible to any numat.ph login plus Arran and Amanda (Wavemaker).
   Numbers come from the nbh_scoreboard database function.
   Targets live in the nbh_kpi_targets table and are edited by leadership. */

import { getPortalUser } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'NuBam Hybrid Scoreboard | NUMAT Portal',
  robots: 'noindex, nofollow',
}
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOW_EMAILS = ['arran@100x100.com', 'amanda@100x100.com']
const LOWER_IS_BETTER = new Set(['b22_reject', 'cmo_cpl', 'b22_cost_board', 'mohan_cycle'])
const OWNER_ORDER = ['mohan', 'eugene', 'cmo', 'b22']

type Row = {
  kpi_key: string
  kpi_name: string
  owner_key: string
  owner_label: string
  category: string
  metric_type: string
  weekly_target: number | null
  monthly_target: number | null
  target_basis: string
  target_note: string | null
  week_actual: number | null
  month_actual: number | null
  sort_order: number
}

type Status = 'on' | 'near' | 'off' | 'none'

const DOT: Record<Status, string> = {
  on: 'bg-green-500',
  near: 'bg-amber-500',
  off: 'bg-red-500',
  none: 'bg-gray-300',
}

function fmt(value: number | null, metric: string): string {
  if (value === null || value === undefined) return '\u2014'
  if (metric === 'percent') return `${value}%`
  return String(value)
}

function status(actual: number | null, target: number | null, key: string): Status {
  if (target === null || target === undefined) return 'none'
  if (actual === null || actual === undefined) return 'none'
  if (LOWER_IS_BETTER.has(key)) {
    if (actual <= target) return 'on'
    if (actual <= target * 1.25) return 'near'
    return 'off'
  }
  if (actual >= target) return 'on'
  if (target > 0 && actual >= target * 0.6) return 'near'
  return 'off'
}

function Cell({
  actual,
  target,
  metric,
  kpiKey,
}: {
  actual: number | null
  target: number | null
  metric: string
  kpiKey: string
}) {
  const s = status(actual, target, kpiKey)
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${DOT[s]}`} aria-hidden />
      <span className="text-gray-900 tabular-nums">{fmt(actual, metric)}</span>
      <span className="text-gray-400 tabular-nums">
        {target === null || target === undefined ? 'tracking' : `/ ${fmt(target, metric)}`}
      </span>
    </div>
  )
}

export default async function ScoreboardPage() {
  const user = await getPortalUser()
  const email = (user?.email || '').toLowerCase()
  const allowed = email.endsWith('@numat.ph') || ALLOW_EMAILS.includes(email)
  if (!allowed) redirect('/portal/access-denied')

  const supabase = await createClient()
  const [{ data: rows, error }, { data: cfg }] = await Promise.all([
    supabase.rpc('nbh_scoreboard'),
    supabase.from('nbh_config').select('key, value'),
  ])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900 mb-2">Could not load the scoreboard</h1>
        <p className="text-sm text-red-800 whitespace-pre-wrap">{error.message}</p>
      </div>
    )
  }

  const config = Object.fromEntries(
    ((cfg ?? []) as Array<{ key: string; value: string }>).map((r) => [r.key, r.value]),
  )
  const all = (rows ?? []) as Row[]
  const groups = OWNER_ORDER.map((key) => ({
    key,
    label: all.find((r) => r.owner_key === key)?.owner_label || key,
    items: all.filter((r) => r.owner_key === key),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">NuBam Hybrid Scoreboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Accelerated push, {config.push_start || ''} to {config.push_end || ''}. Targets are weekly and monthly.
          Green is on target, amber is close, red is behind, grey is tracked with no fixed target yet.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.key} className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">{g.label}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-5 py-2 font-medium">KPI</th>
                  <th className="px-5 py-2 font-medium">This week</th>
                  <th className="px-5 py-2 font-medium">This month</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((r) => (
                  <tr key={r.kpi_key} className="border-t border-gray-100 align-top">
                    <td className="px-5 py-3">
                      <div className="text-gray-900">{r.kpi_name}</div>
                      {r.target_note ? <div className="mt-0.5 text-xs text-gray-400">{r.target_note}</div> : null}
                    </td>
                    <td className="px-5 py-3">
                      {r.weekly_target === null || r.weekly_target === undefined ? (
                        <span className="text-gray-300">{'\u2014'}</span>
                      ) : (
                        <Cell actual={r.week_actual} target={r.weekly_target} metric={r.metric_type} kpiKey={r.kpi_key} />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Cell actual={r.month_actual} target={r.monthly_target} metric={r.metric_type} kpiKey={r.kpi_key} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-xs text-gray-400">
        Numbers update live from the CRM and the production log. A KPI stays blank until its data is tagged to NuBam
        Hybrid (leads and samples) or logged as a hybrid board run (production).
      </p>
    </div>
  )
}
