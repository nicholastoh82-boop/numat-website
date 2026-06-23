'use client'

type MonthRow = {
  month: string
  rate: number
  bookedPhp: number
  bookedUsd: number
  earnedPhp: number
  earnedUsd: number
  collectedPhp: number
  collectedUsd: number
  cashOutUsd: number
  netUsd: number
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
  months,
  pipeline,
  deals,
  latestRate,
}: {
  months: MonthRow[]
  pipeline: { stage: string; leads: number }[]
  deals: Record<string, unknown>[]
  latestRate: number
}) {
  const order = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost']
  const pipeSorted = [...pipeline].sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage))
  const s = (v: unknown) => (v === null || v === undefined || v === '' ? 'n/a' : String(v))

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">NUMAT Board View</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monthly performance and live pipeline. USD figures are converted from pesos at monthly average rates (latest {latestRate.toFixed(2)}).
          </p>
        </header>

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
                    <td className="px-4 py-3">{usd(r.cashOutUsd)}</td>
                    <td className={'px-4 py-3 ' + (r.netUsd < 0 ? 'text-red-600' : 'text-green-700')}>{usd(r.netUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Booked is contracts or invoices signed that month. Earned is product delivered that month, shown from June onward when delivery logging began.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Pipeline by stage</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {pipeSorted.map((p) => (
              <div key={p.stage} className="rounded-xl border border-gray-200 p-4">
                <div className="text-2xl font-semibold">{p.leads.toLocaleString('en-US')}</div>
                <div className="mt-1 text-xs capitalize text-gray-500">{p.stage.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Active deals</h2>
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
                {deals.map((d, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium">{s(d.company)}</td>
                    <td className="px-4 py-3 text-gray-600">{s(d.full_name)}</td>
                    <td className="px-4 py-3 text-gray-600">{s(d.rep_assigned)}</td>
                    <td className="px-4 py-3 capitalize">{s(d.pipeline_stage).replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-gray-600">{s(d.country)}</td>
                    <td className="px-4 py-3 text-right">{d.deal_value_php ? php(Number(d.deal_value_php)) : 'n/a'}</td>
                  </tr>
                ))}
                {deals.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No active deals.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
