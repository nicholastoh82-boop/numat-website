'use client'
import { useState } from 'react'

type MonthRow = {
  month: string
  bookedPhp: number; bookedUsd: number
  earnedPhp: number; earnedUsd: number
  collectedPhp: number; collectedUsd: number
  cashOutPhp: number; cashOutUsd: number
  unrealisedPhp: number; unrealisedUsd: number
  netPhp: number; netUsd: number
}

const fmt = (sym: string, n: number) => {
  const v = Math.round(Math.abs(n)).toLocaleString('en-US')
  return n < 0 ? `(${sym}${v})` : `${sym}${v}`
}
const php = (n: number) => fmt('\u20B1', n)
const usd = (n: number) => fmt('$', n)
const mlabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function BoardDashboard({
  months, pipeline, deals, fxRate, embedded = false,
}: {
  months: MonthRow[]
  pipeline: { stage: string; leads: number }[]
  deals: Record<string, unknown>[]
  fxRate: number
  embedded?: boolean
}) {
  const [view, setView] = useState<'all' | 'monthly' | 'pipeline' | 'deals'>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const show = (k: string) => view === 'all' || view === k
  const order = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost']
  const pipeSorted = [...pipeline].sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage))
  const s = (v: unknown) => (v === null || v === undefined || v === '' ? 'n/a' : String(v))
  const intro = `Monthly performance and live pipeline. USD figures use a fixed rate of ${fxRate} pesos per USD, the same rate as the CEO dashboard.`

  const toggles = (
    <div className="mb-6 flex flex-wrap gap-2">
      {([['all', 'All'], ['monthly', 'Monthly reporting'], ['pipeline', 'Pipeline'], ['deals', 'Active deals']] as const).map(([k, label]) => (
        <button
          key={k}
          onClick={() => setView(k)}
          className={'rounded-full border px-3 py-1 text-xs font-medium transition ' + (view === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-600 hover:border-gray-500')}
        >
          {label}
        </button>
      ))}
    </div>
  )

  const sections = (
    <>
      {show('monthly') && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Monthly reporting</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Month</th>
                  <th className="px-4 py-3 font-medium">Booked</th>
                  <th className="px-4 py-3 font-medium">Earned</th>
                  <th className="px-4 py-3 font-medium">Cash collected</th>
                  <th className="px-4 py-3 font-medium">Unrealised</th>
                  <th className="px-4 py-3 font-medium">Cash out</th>
                  <th className="px-4 py-3 font-medium">Net cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {months.map((r) => (
                  <tr key={r.month}>
                    <td className="px-4 py-3 font-medium">{mlabel(r.month)}</td>
                    <td className="px-4 py-3">{usd(r.bookedUsd)}<div className="text-xs text-gray-400">{php(r.bookedPhp)}</div></td>
                    <td className="px-4 py-3">{usd(r.earnedUsd)}<div className="text-xs text-gray-400">{php(r.earnedPhp)}</div></td>
                    <td className="px-4 py-3">{usd(r.collectedUsd)}<div className="text-xs text-gray-400">{php(r.collectedPhp)}</div></td>
                    <td className="px-4 py-3" title="Customer orders signed but not yet delivered">{usd(r.unrealisedUsd)}</td>
                    <td className="px-4 py-3">{usd(r.cashOutUsd)}<div className="text-xs text-gray-400">{php(r.cashOutPhp)}</div></td>
                    <td className={'px-4 py-3 ' + (r.netUsd < 0 ? 'text-red-600' : 'text-green-700')}>{usd(r.netUsd)}<div className="text-xs text-gray-400">{php(r.netPhp)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Booked is contracts or invoices signed that month. Earned is product delivered that month, shown from June onward when delivery logging began. Unrealised is cumulative booked minus delivered: customer commitments still pending fulfillment.
          </p>
        </section>
      )}

      {show('pipeline') && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Pipeline by stage</h2>
          <p className="mb-3 text-xs text-gray-500">Click a stage to see those deals below.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {pipeSorted.map((p) => {
              const active = stageFilter === p.stage
              return (
                <button
                  key={p.stage}
                  onClick={() => setStageFilter(active ? 'all' : p.stage)}
                  className={'rounded-xl border p-4 text-left transition ' + (active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white hover:border-gray-400')}
                >
                  <div className="text-2xl font-semibold">{p.leads.toLocaleString('en-US')}</div>
                  <div className={'mt-1 text-xs capitalize ' + (active ? 'text-gray-200' : 'text-gray-500')}>{p.stage.replace('_', ' ')}</div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {(show('deals') || (view === 'pipeline' && stageFilter !== 'all')) && (() => {
        const filteredDeals = stageFilter === 'all' ? deals : deals.filter(d => String(d.pipeline_stage) === stageFilter)
        const totalPhp = filteredDeals.reduce((a, d) => a + (Number(d.deal_value_php) || 0), 0)
        const stageLabel = stageFilter === 'all' ? 'All' : stageFilter.replace('_', ' ')
        return (
          <section>
            <div className="mb-3 flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Active deals <span className="text-sm font-normal text-gray-500 capitalize">— {stageLabel}</span></h2>
              {stageFilter !== 'all' && (
                <button onClick={() => setStageFilter('all')} className="text-xs text-gray-500 underline hover:text-gray-900">Clear filter</button>
              )}
            </div>
            <div className="mb-4 rounded-xl border border-gray-300 bg-gray-50 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Total ({filteredDeals.length} deals)</div>
              <div className="mt-1 text-2xl font-semibold">{usd(totalPhp / fxRate)}</div>
              <div className="text-xs text-gray-500">{php(totalPhp)}</div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Rep</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Country</th>
                    <th className="px-4 py-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDeals.map((d, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium">{s(d.company)}</td>
                      <td className="px-4 py-3 text-gray-600">{s(d.full_name)}</td>
                      <td className="px-4 py-3 text-gray-600">{s(d.rep_assigned)}</td>
                      <td className="px-4 py-3 capitalize">{s(d.pipeline_stage).replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-gray-600">{s(d.country)}</td>
                      <td className="px-4 py-3 text-right">{d.deal_value_php ? php(Number(d.deal_value_php)) : 'n/a'}</td>
                    </tr>
                  ))}
                  {filteredDeals.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No deals at this stage.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )
      })()}
    </>
  )

  if (embedded) {
    return (
      <div className="border-t border-gray-200 bg-white text-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-xl font-semibold">Live operations and reporting</h2>
          <p className="mb-6 mt-1 text-sm text-gray-500">{intro}</p>
          {toggles}
          {sections}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">NUMAT Partner View</h1>
          <p className="mt-1 text-sm text-gray-500">{intro}</p>
        </header>
        {toggles}
        {sections}
      </div>
    </div>
  )
}
