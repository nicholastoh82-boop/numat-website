/* app/portal/(authed)/ceo/_components/CeoDashboard.tsx
   Renders the CEO dashboard from edge function payload.
   Direct port of /ceo-dashboard.html visual structure into JSX. */

'use client'

import { useMemo, useState } from 'react'

type Props = { data: any }

const STAGE_COLORS: Record<string, string> = {
  new: '#94a3b8',
  contacted: '#60a5fa',
  qualified: '#3b82f6',
  proposal_sent: '#1d4ed8',
  meeting_booked: '#7c3aed',
  negotiation: '#a16207',
  won: '#1a6b3c',
  lost: '#c0392b',
}

function fmtPhp(n: number): string {
  return 'PHP ' + Math.round(n || 0).toLocaleString('en-US')
}
function fmtUsd(n: number): string {
  return 'USD ' + (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toFixed(1) + '%'
}
function full(n: number, currency: string = 'PHP'): string {
  // No rounding. Show the actual value with thousands separators and 2 decimals.
  const x = Number(n || 0)
  return currency + ' ' + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fullNum(n: number): string {
  const x = Number(n || 0)
  return x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CeoDashboard({ data }: Props) {
  const fx = data.fx?.php_per_usd ?? 57.5
  const sales = data.sales || {}
  const wp = data.weighted_pipeline || {}
  const ar = data.ar || {}
  const fin = data.financial || {}
  const out = data.outreach || {}
  const quotes = data.quotes || {}
  const prod = data.production || {}
  const trend = data.revenue_trend || []

  const generatedAt = data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'

  // ---- Period toggle for total sales ----
  type Period = 'mtd' | 'ytd' | 'all'
  const [period, setPeriod] = useState<Period>('mtd')

  const totalSales = useMemo(() => {
    const now = new Date()
    const ymThis = now.toISOString().slice(0, 7)
    const yThis = ymThis.slice(0, 4)
    let salesPhp = 0
    let salesUsd = 0
    let label = ''
    if (period === 'mtd') {
      salesPhp = (fin.current_month?.income || 0)
      label = `Month to date (${ymThis})`
    } else if (period === 'ytd') {
      const ytdMonths = (trend || []).filter((m: any) => String(m.month_key || '').startsWith(yThis))
      salesPhp = ytdMonths.reduce((s: number, m: any) => s + (m.revenue_php || 0), 0)
      salesUsd = ytdMonths.reduce((s: number, m: any) => s + (m.revenue_usd || 0), 0)
      label = `Year to date (${yThis})`
    } else {
      salesPhp = (trend || []).reduce((s: number, m: any) => s + (m.revenue_php || 0), 0)
      salesUsd = (trend || []).reduce((s: number, m: any) => s + (m.revenue_usd || 0), 0)
      label = `All time (${(trend || []).length} months on record)`
    }
    return { salesPhp, salesUsd, label }
  }, [period, fin, trend])

  // KPI strip
  const totalCash = fin.total_cash_php || 0
  const runway = fin.runway_months ?? 0
  const arOutstanding = ar.total_outstanding_php || 0
  const arOverdue = ar.overdue_total_php || 0
  const pipelineWeighted = wp.total_weighted_php || 0
  const replyRate = out.reply_rate_pct || 0

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CEO Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">Live data, FX 1 USD = PHP {fx.toFixed(2)}</p>
        </div>
        <div className="text-xs text-gray-500">Generated {generatedAt}</div>
      </header>

      {/* TOTAL SALES with period toggle */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total sales</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">
              {full(totalSales.salesPhp)}
              {totalSales.salesUsd > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">+ {full(totalSales.salesUsd, 'USD')}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">{totalSales.label}</div>
          </div>
          <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
            {(['mtd', 'ytd', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-xs font-medium ${
                  period === p ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p === 'mtd' ? 'Month' : p === 'ytd' ? 'Year' : 'All time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TOP STRIP: per account balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AccountKpi accounts={fin.account_balances || []} matchCurrency="PHP" matchName="RCBC" label="RCBC PHP" />
        <AccountKpi accounts={fin.account_balances || []} matchCurrency="USD" matchName="OCBC" label="OCBC USD" />
        <AccountKpi accounts={fin.account_balances || []} matchCurrency="SGD" matchName="OCBC" label="OCBC SGD" />
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Runway" value={runway > 0 ? `${runway.toFixed(1)} mo` : '—'} sub={`Burn ${full(fin.monthly_burn_estimate || 0)}/mo`} color={runway < 6 ? 'red' : runway < 12 ? 'amber' : 'emerald'} />
        <Kpi label="Pipeline (weighted)" value={fmtPhp(pipelineWeighted)} sub={`Raw ${full(wp.total_raw_php || 0)}`} color="blue" />
        <Kpi label="AR outstanding" value={fmtPhp(arOutstanding)} sub={`Overdue ${full(arOverdue)}`} color={arOverdue > 0 ? 'red' : 'gray'} />
        <Kpi label="Reply rate" value={fmtPct(replyRate)} sub={`${out.sent_total || 0} sent, ${out.replies_total || 0} replies`} color="navy" />
        <Kpi label="Factory util" value={prod.no_data ? '—' : fmtPct(prod.current_utilization_pct)} sub={prod.utilization_basis || ''} color={prod.current_utilization_pct < (prod.break_even_util_pct || 0) ? 'amber' : 'emerald'} />
      </div>

      {/* SALES PIPELINE */}
      <Section title="Sales Pipeline" sub={`${sales.total_leads || 0} leads, ${sales.upcoming_meetings || 0} meetings booked`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Pipeline by stage">
            <div className="space-y-1.5">
              {(wp.stages || []).map((s: any) => {
                const maxCount = Math.max(...(wp.stages || []).map((x: any) => x.count || 0), 1)
                const widthPct = (s.count / maxCount) * 100
                return (
                  <div key={s.stage} className="grid grid-cols-[110px_1fr_auto] gap-2 items-center text-xs">
                    <div className="text-gray-700 truncate">{s.label}</div>
                    <div className="bg-gray-100 rounded h-5 relative overflow-hidden">
                      <div className="h-full rounded transition-all" style={{ width: `${widthPct}%`, background: STAGE_COLORS[s.stage] || '#64748b' }} />
                      <div className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-white mix-blend-difference">{s.count}</div>
                    </div>
                    <div className="text-right text-gray-600 tabular-nums">{fullNum(s.weighted_php)}</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
              <div className="flex justify-between"><span>Active raw value</span><span className="tabular-nums">{fmtPhp(wp.total_raw_php || 0)}</span></div>
              <div className="flex justify-between"><span>Weighted by close prob</span><span className="tabular-nums font-medium text-gray-900">{fmtPhp(wp.total_weighted_php || 0)}</span></div>
            </div>
          </Card>

          <Card title="Rep performance">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.entries(sales.rep_breakdown || {}).map(([rep, v]: any) => (
                <div key={rep} className="rounded border border-gray-200 p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{rep}</div>
                  <div className="text-lg font-semibold text-gray-900 mt-1">{v.count}</div>
                  <div className="text-xs text-gray-600 mt-1">{fullNum(v.value_php)} PHP / {fullNum(v.value_usd || 0)} USD</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Top segments</div>
              <div className="space-y-1.5">
                {Object.entries(sales.by_segment || {})
                  .sort(([, a]: any, [, b]: any) => b.value - a.value)
                  .slice(0, 6)
                  .map(([seg, v]: any) => (
                    <div key={seg} className="flex justify-between text-xs">
                      <span className="text-gray-700 truncate">{seg}</span>
                      <span className="text-gray-600 tabular-nums">{v.count} · {fullNum(v.value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* FINANCIAL HEALTH */}
      <Section title="Financial Health" sub={`${trend.length} months of revenue history`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="This month (running)">
            <PLBlock pl={fin.current_month} />
          </Card>
          <Card title="Last full month">
            <PLBlock pl={fin.last_month} />
          </Card>
          <Card title="Account balances">
            <div className="space-y-1.5 text-xs">
              {(fin.account_balances || []).map((a: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-700 truncate">{a.account_name || a.name}</span>
                  <span className="tabular-nums text-gray-900">{a.currency} {Number(a.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between font-medium">
                <span className="text-gray-700">Total in PHP</span>
                <span className="tabular-nums text-gray-900">{fmtPhp(fin.total_cash_php || 0)}</span>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* FACTORY UTILIZATION */}
      <Section title="Factory Utilization" sub={prod.utilization_basis || ''}>
        <Card title="">
          <UtilBar
            current={prod.current_utilization_pct}
            breakEven={prod.break_even_util_pct}
            avgContrib={prod.avg_contribution_php_per_board}
            beBoards={prod.break_even_boards}
            capacity={prod.full_capacity_boards}
          />
        </Card>
      </Section>

      {/* AR */}
      <Section title="Accounts Receivable" sub={`${(ar.records || []).filter((r: any) => !['settled','written_off'].includes(r.status)).length} open invoices`}>
        <Card title="">
          <ArTable records={ar.records || []} />
        </Card>
      </Section>

      {/* OUTREACH + QUOTES */}
      <Section title="Outreach and Quotes">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Outreach this period">
            <div className="space-y-1.5 text-xs">
              <Row label="Sent total" value={String(out.sent_total || 0)} />
              <Row label="Sent this month" value={String(out.sent_this_month || 0)} />
              <Row label="Sent last month" value={String(out.sent_last_month || 0)} />
              <Row label="Replies total" value={String(out.replies_total || 0)} />
              <Row label="Reply rate" value={fmtPct(out.reply_rate_pct)} />
              <Row label="Upcoming meetings" value={String(out.upcoming_meetings || 0)} />
            </div>
          </Card>
          <Card title="Quotes and invoices">
            <div className="space-y-1.5 text-xs">
              <Row label="Active proformas" value={`${quotes.proformas_active_count || 0} · ${full(quotes.proformas_total_php || 0)}`} />
              <Row label="Converted proformas" value={`${quotes.proformas_converted_count || 0} · ${full(quotes.proformas_converted_php || 0)}`} />
              <Row label="Unpaid invoices" value={`${quotes.invoices_unpaid_count || 0} · ${full(quotes.invoices_unpaid_total_php || 0)}`} />
            </div>
            {(() => {
              const recent = quotes.recent || []
              // Find proforma IDs that have a corresponding invoice in the same response
              const convertedIds = new Set(
                recent.filter((q: any) => q.doc_type === 'invoice' && q.converted_from_proforma_id)
                      .map((q: any) => String(q.converted_from_proforma_id))
              )
              const filtered = recent.filter((q: any) => !(q.doc_type === 'proforma_invoice' && convertedIds.has(String(q.id))))
              if (filtered.length === 0) return null
              return (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Recent</div>
                <div className="space-y-1.5">
                  {filtered.slice(0, 6).map((q: any) => (
                    <div key={q.id} className="flex justify-between items-start text-xs">
                      <div className="min-w-0">
                        <div className="text-gray-900 truncate">{q.company || q.customer_name || 'Unknown'}</div>
                        <div className="text-gray-500">
                          {q.doc_type === 'invoice' ? 'Invoice' : 'Proforma'} · {String(q.created_at || '').slice(0, 10)} · {q.payment_status || q.status}
                        </div>
                      </div>
                      <div className="text-gray-700 tabular-nums shrink-0 ml-2">{q.currency || 'PHP'} {fullNum(q.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
              )
            })()}
          </Card>
        </div>
      </Section>
    </div>
  )
}

/* ----- small reusable bits ----- */

function AccountKpi({
  accounts,
  matchCurrency,
  matchName,
  label,
}: {
  accounts: any[]
  matchCurrency: string
  matchName: string
  label: string
}) {
  const acc = accounts.find(
    (a) =>
      String(a.currency || '').toUpperCase() === matchCurrency &&
      String(a.account_name || a.name || '').toUpperCase().includes(matchName.toUpperCase()),
  )
  const balance = acc ? Number(acc.balance || 0) : 0
  const found = !!acc
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="text-xl font-semibold mt-1 text-emerald-900 tabular-nums">
        {matchCurrency} {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-[11px] text-gray-500 mt-1 truncate">
        {found ? (acc.account_name || acc.name || '') : 'Account not found in feed'}
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50',
    red: 'border-red-200 bg-red-50',
    amber: 'border-amber-200 bg-amber-50',
    blue: 'border-blue-200 bg-blue-50',
    navy: 'border-slate-200 bg-slate-50',
    gray: 'border-gray-200 bg-white',
  }
  const textColors: Record<string, string> = {
    emerald: 'text-emerald-800',
    red: 'text-red-800',
    amber: 'text-amber-800',
    blue: 'text-blue-800',
    navy: 'text-slate-800',
    gray: 'text-gray-900',
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[color] || colors.gray}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${textColors[color] || 'text-gray-900'}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-1 truncate">{sub}</div>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {sub && <span className="text-xs text-gray-500">{sub}</span>}
      </div>
      {children}
    </section>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {title && <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">{title}</div>}
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900 tabular-nums">{value}</span>
    </div>
  )
}

function PLBlock({ pl }: { pl: any }) {
  if (!pl) return <div className="text-sm text-gray-400">No data</div>
  return (
    <div className="space-y-1.5 text-xs">
      <Row label="Income" value={fmtPhp(pl.income || 0)} />
      <Row label="Expenses" value={fmtPhp(pl.expenses || 0)} />
      <Row label="Salaries" value={fmtPhp(pl.salaries || 0)} />
      <div className="pt-2 mt-2 border-t border-gray-100">
        <div className={`flex justify-between font-medium ${(pl.net || 0) < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
          <span>Net</span>
          <span className="tabular-nums">{fmtPhp(pl.net || 0)}</span>
        </div>
      </div>
    </div>
  )
}

function UtilBar({ current, breakEven, avgContrib, beBoards, capacity }: { current: number | null; breakEven: number | null; avgContrib: number | null; beBoards: number | null; capacity: number }) {
  const cur = current ?? 0
  const be = breakEven ?? 0
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-2xl font-semibold text-gray-900">{fmtPct(current)}</div>
        <div className="text-xs text-gray-500">Capacity {capacity} boards/mo</div>
      </div>
      <div className="relative h-6 bg-gray-100 rounded overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-emerald-600 transition-all" style={{ width: `${Math.min(cur, 100)}%` }} />
        {be > 0 && (
          <div className="absolute inset-y-0 border-l-2 border-red-600" style={{ left: `${Math.min(be, 100)}%` }} title={`Break even ${fmtPct(be)}`} />
        )}
      </div>
      <div className="flex justify-between text-[11px] text-gray-500 mt-1">
        <span>0%</span>
        {be > 0 && <span style={{ marginLeft: `${be - 5}%` }}>BE {fmtPct(be)}</span>}
        <span>100%</span>
      </div>
      {avgContrib && beBoards && (
        <div className="text-xs text-gray-500 mt-3">
          Avg contribution {fmtPhp(avgContrib)}/board, break even at {beBoards} boards/mo
        </div>
      )}
    </div>
  )
}

function ArTable({ records }: { records: any[] }) {
  const open = records.filter((r) => !['settled', 'written_off'].includes(r.status))
  if (open.length === 0) {
    return <div className="text-sm text-gray-500">No open invoices.</div>
  }
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead className="text-gray-700">
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-1 font-medium">Customer</th>
            <th className="text-left py-2 px-1 font-medium">Invoice</th>
            <th className="text-left py-2 px-1 font-medium">Due</th>
            <th className="text-left py-2 px-1 font-medium">Status</th>
            <th className="text-right py-2 px-1 font-medium">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {open.map((r: any, i: number) => {
            const overdue = r.due_date && r.due_date < today
            return (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1.5 px-1 text-gray-900">{r.customer || r.customer_name || r.company || '—'}</td>
                <td className="py-1.5 px-1 text-gray-700">{r.invoice_number || '—'}</td>
                <td className={`py-1.5 px-1 ${overdue ? 'text-red-700 font-medium' : 'text-gray-700'}`}>{r.due_date || '—'}</td>
                <td className="py-1.5 px-1 text-gray-700">{r.status || '—'}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-gray-900">{r.currency || 'PHP'} {Number(r.outstanding_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
