/* app/portal/(authed)/ceo/_components/CeoDashboard.tsx
   Renders the CEO dashboard from edge function payload.
   Direct port of /ceo-dashboard.html visual structure into JSX. */

'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import EmailCounter from '@/components/portal/EmailCounter'

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

  // ---- Period control (server side aware) ----
  const router = useRouter()
  const pathname = usePathname()
  const periodInfo = (data.period || { type: 'mtd', label: 'Month to date', start: '', end: '' })
  const periodAgg = (data.period_aggregates || { pl: {}, invoices_issued: {}, outreach: {}, won: {}, lost: {} })
  const currentPeriod: 'mtd' | 'ytd' | 'all' | 'custom' = periodInfo.type as any

  // Custom range pickers state (only relevant when period === 'custom')
  const [customFrom, setCustomFrom] = useState<string>(periodInfo.start || '')
  const [customTo, setCustomTo] = useState<string>(periodInfo.end || '')
  const [view, setView] = useState<'overview' | 'monthly'>('overview')

  function setPeriod(p: 'mtd' | 'ytd' | 'all') {
    router.push(`${pathname}?period=${p}`)
  }
  function applyCustom() {
    if (!customFrom || !customTo) return
    router.push(`${pathname}?period=custom&from=${customFrom}&to=${customTo}`)
  }

  // Total sales = period income (PHP + USD broken out)
  const periodSalesPhp = periodAgg.pl?.income_php || 0
  const periodSalesUsd = periodAgg.pl?.income_usd || 0
  const periodSalesPhpTotal = periodAgg.pl?.income_php_total || 0

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

      {/* Tabs: Overview and Monthly reporting */}
      <div className="flex gap-1 border border-gray-200 rounded-lg p-1 w-fit">
        {(['overview', 'monthly'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              view === v ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {v === 'overview' ? 'Overview' : 'Monthly reporting'}
          </button>
        ))}
      </div>

      {view === 'monthly' && <MonthlyReporting rows={data.pa_monthly || []} cashAtBank={data.cash_at_bank || { usd_total: 0, accounts: [] }} />}

      {view === 'overview' && (
      <>
      {/* EMAIL PRODUCTIVITY COUNTER (scoped server side; ceo sees all reps) */}
      <EmailCounter />

      {/* PERIOD CONTROL with period summary (drives the whole dashboard) */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total sales for period</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">
              {full(periodSalesPhp)}
              {periodSalesUsd > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">+ {full(periodSalesUsd, 'USD')}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">{periodInfo.label}</div>
          </div>
          <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
            {(['mtd', 'ytd', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-xs font-medium ${
                  currentPeriod === p ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p === 'mtd' ? 'Month' : p === 'ytd' ? 'Year' : 'All time'}
              </button>
            ))}
            <button
              onClick={() => router.push(`${pathname}?period=custom&from=${customFrom || periodInfo.start}&to=${customTo || periodInfo.end}`)}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                currentPeriod === 'custom' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {currentPeriod === 'custom' && (
          <div className="flex items-end gap-2 flex-wrap pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo}
              className="px-3 py-1.5 bg-gray-900 text-white rounded text-xs font-medium disabled:opacity-50"
            >
              Apply range
            </button>
          </div>
        )}
      </div>

      {/* PERIOD METRICS GRID (responds to toggle) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label={`Income (${periodInfo.type === 'mtd' ? 'MTD' : periodInfo.type === 'ytd' ? 'YTD' : periodInfo.type === 'custom' ? 'Custom' : 'All time'})`} value={full(periodSalesPhpTotal)} sub={`PHP ${periodSalesPhp.toLocaleString()} + USD ${periodSalesUsd.toLocaleString()}`} color="emerald" />
        <Kpi label="Expenses" value={full(periodAgg.pl?.expenses_php || 0)} sub="Period operating costs" color="red" />
        <Kpi label="Net" value={full(periodAgg.pl?.net_php || 0)} sub="Income minus expenses" color={(periodAgg.pl?.net_php || 0) < 0 ? 'red' : 'emerald'} />
        <Kpi label="Invoices issued" value={`${periodAgg.invoices_issued?.count || 0}`} sub={`Value ${full(periodAgg.invoices_issued?.value_php || 0)}`} color="blue" />
        <Kpi label="Won deals" value={`${periodAgg.won?.count || 0}`} sub={`Value ${full(periodAgg.won?.value_php || 0)}`} color="emerald" />
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

      {/* OUTSTANDING ORDERS (master orders not yet fully delivered) */}
      {data.outstanding_orders && data.outstanding_orders.count > 0 && (
        <Section title="Outstanding Orders (yet to deliver)" sub={`${data.outstanding_orders.count} active master order(s) | Total remaining value PHP ${Number(data.outstanding_orders.total_remaining_value_php || 0).toLocaleString()}`}>
          <Card title="">
            <OutstandingOrdersTable records={data.outstanding_orders.records || []} />
          </Card>
        </Section>
      )}

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
      </>
      )}
    </div>
  )
}

/* ----- small reusable bits ----- */

function MonthlyReporting({ rows, cashAtBank }: { rows: any[]; cashAtBank: { usd_total: number; accounts: any[] } }) {
  const RATE = 60
  const php = (n: number) => 'PHP ' + Math.round(n || 0).toLocaleString('en-US')
  const usd = (n: number) => 'USD ' + Math.round((n || 0) / RATE).toLocaleString('en-US')
  const monthLabel = (m: string) => new Date(m + 'T00:00:00').toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const months: string[] = (rows || []).map((r: any) => r.month)
  const currentMonth = (() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) })()
  const defaultMonth = months.includes(currentMonth) ? currentMonth : (months[0] || currentMonth)

  const [month, setMonth] = useState<string>(defaultMonth)
  const [detail, setDetail] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDetail(null)
    fetch(`/api/portal/ceo/month-detail?month=${month}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (!cancelled) setDetail(d) })
      .catch(() => { if (!cancelled) setDetail({ error: true }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [month])

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
        No monthly data yet.
      </div>
    )
  }

  const summary = (rows || []).find((r: any) => r.month === month) || { booked: 0, earned: 0, collected: 0, cashout: 0, net: 0 }
  const metrics = [
    { key: 'booked', label: 'Booked revenue', value: summary.booked },
    { key: 'earned', label: 'Earned revenue', value: summary.earned },
    { key: 'collected', label: 'Cash received for sales', value: summary.collected },
    { key: 'cashout', label: 'Cash out', value: summary.cashout },
    { key: 'net', label: 'Net cash', value: summary.net },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="text-xs text-gray-500">Cash at bank now (bank accounts, current balance)</div>
          <div className="text-xl font-semibold text-gray-900 tabular-nums">{'USD ' + Math.round(cashAtBank?.usd_total || 0).toLocaleString('en-US')}</div>
        </div>
        {cashAtBank?.accounts?.length ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {cashAtBank.accounts.map((a: any) => (
              <span key={a.name} className="tabular-nums">{a.name}: {'USD ' + Math.round(a.usd || 0).toLocaleString('en-US')}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Monthly reporting</div>
          <div className="text-xs text-gray-500 mt-1">Figures in PHP with the USD equivalent at a fixed 1 USD to 60 PHP. Pick a month, then open a row to see what makes it up.</div>
        </div>
        <select
          value={month}
          onChange={(e) => { setMonth(e.target.value); setOpen(null) }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white"
        >
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((m) => (
          <div key={m.key} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">{m.label}</div>
            <div className={`text-lg font-semibold mt-1 tabular-nums ${m.key === 'net' ? ((m.value || 0) < 0 ? 'text-red-700' : 'text-emerald-700') : 'text-gray-900'}`}>{php(m.value)}</div>
            <div className="text-xs text-gray-500 tabular-nums">{usd(m.value)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        <Acc id="collected" title="Cash received for sales" hint="Customer payments received this month." open={open} setOpen={setOpen} loading={loading}>
          <CollectedTable items={detail?.collected || []} />
        </Acc>
        <Acc id="booked" title="Booked revenue" hint="Invoices signed this month. Outstanding and due date show what to chase." open={open} setOpen={setOpen} loading={loading}>
          <BookedTable items={detail?.booked || []} />
        </Acc>
        <Acc id="earned" title="Earned revenue" hint="Product delivered this month." open={open} setOpen={setOpen} loading={loading}>
          <EarnedTable items={detail?.earned || []} />
        </Acc>
        <Acc id="cashout" title="Cash out" hint="Cash paid out this month, grouped by category." open={open} setOpen={setOpen} loading={loading}>
          <CashoutTable items={detail?.cashout || []} />
        </Acc>
      </div>

      <p className="text-xs text-gray-500">Net cash is cash received for sales minus cash out.</p>
    </div>
  )
}

function Acc({ id, title, hint, open, setOpen, loading, children }: { id: string; title: string; hint: string; open: string | null; setOpen: (v: string | null) => void; loading: boolean; children: React.ReactNode }) {
  const isOpen = open === id
  return (
    <div>
      <button onClick={() => setOpen(isOpen ? null : id)} className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-gray-50">
        <div>
          <div className="text-sm font-medium text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{hint}</div>
        </div>
        <span className="text-xs text-gray-500 shrink-0">{isOpen ? 'Hide' : 'Show'}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          {loading ? <div className="text-xs text-gray-500 py-2">Loading</div> : children}
        </div>
      )}
    </div>
  )
}

function money(cur: string, n: number): string {
  return (cur || 'PHP') + ' ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function dateShort(s: string): string {
  if (!s) return ''
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function Empty() {
  return <div className="text-xs text-gray-500 py-2">No items for this month.</div>
}

function CollectedTable({ items }: { items: any[] }) {
  if (!items || items.length === 0) return <Empty />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-1.5 px-2 font-medium">Date</th>
            <th className="py-1.5 px-2 font-medium">From</th>
            <th className="py-1.5 px-2 font-medium">Description</th>
            <th className="py-1.5 px-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r: any, i: number) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5 px-2 text-gray-700 whitespace-nowrap">{dateShort(r.transaction_date)}</td>
              <td className="py-1.5 px-2 text-gray-900">{r.vendor_payee || 'Unknown'}</td>
              <td className="py-1.5 px-2 text-gray-600">{r.description || ''}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-gray-900 whitespace-nowrap">{money(r.currency, r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BookedTable({ items }: { items: any[] }) {
  if (!items || items.length === 0) return <Empty />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-1.5 px-2 font-medium">Invoice</th>
            <th className="py-1.5 px-2 font-medium">Customer</th>
            <th className="py-1.5 px-2 font-medium text-right">Value</th>
            <th className="py-1.5 px-2 font-medium text-right">Outstanding</th>
            <th className="py-1.5 px-2 font-medium">Due</th>
            <th className="py-1.5 px-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r: any, i: number) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5 px-2 text-gray-700 whitespace-nowrap">{r.invoice_number || ''}</td>
              <td className="py-1.5 px-2 text-gray-900">{r.customer || 'Unknown'}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-gray-900 whitespace-nowrap">{money(r.currency, r.invoice_value)}</td>
              <td className={`py-1.5 px-2 text-right tabular-nums whitespace-nowrap ${Number(r.outstanding_amount || 0) > 0 ? 'text-red-700' : 'text-gray-400'}`}>{money(r.currency, r.outstanding_amount)}</td>
              <td className="py-1.5 px-2 text-gray-700 whitespace-nowrap">{dateShort(r.due_date)}</td>
              <td className="py-1.5 px-2 text-gray-600">{r.status || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EarnedTable({ items }: { items: any[] }) {
  if (!items || items.length === 0) return <Empty />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-1.5 px-2 font-medium">Date</th>
            <th className="py-1.5 px-2 font-medium">Customer</th>
            <th className="py-1.5 px-2 font-medium">Product</th>
            <th className="py-1.5 px-2 font-medium text-right">Qty</th>
            <th className="py-1.5 px-2 font-medium text-right">Value</th>
            <th className="py-1.5 px-2 font-medium">Invoice</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r: any, i: number) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5 px-2 text-gray-700 whitespace-nowrap">{dateShort(r.delivery_date)}</td>
              <td className="py-1.5 px-2 text-gray-900">{r.customer || 'Unknown'}</td>
              <td className="py-1.5 px-2 text-gray-700">{r.product || ''}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-gray-700 whitespace-nowrap">{Number(r.qty || 0).toLocaleString('en-US')} {r.unit || ''}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-gray-900 whitespace-nowrap">{money(r.currency, r.delivered_value)}</td>
              <td className="py-1.5 px-2 text-gray-600 whitespace-nowrap">{r.invoice_number || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CashoutTable({ items }: { items: any[] }) {
  const RATE = 60
  const [openCat, setOpenCat] = useState<string | null>(null)
  if (!items || items.length === 0) return <Empty />

  const map = new Map<string, { category: string; count: number; total: number; rows: any[] }>()
  for (const r of items) {
    const key = r.category || 'Other'
    const factor = r.currency === 'PHP' ? 1 : RATE
    const g = map.get(key) || { category: key, count: 0, total: 0, rows: [] }
    g.count += 1
    g.total += Number(r.amount || 0) * factor
    g.rows.push(r)
    map.set(key, g)
  }
  const groups = Array.from(map.values()).sort((a, b) => b.total - a.total)
  const grand = groups.reduce((s, g) => s + g.total, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-1.5 px-2 font-medium">Category</th>
            <th className="py-1.5 px-2 font-medium text-right">Items</th>
            <th className="py-1.5 px-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const isOpen = openCat === g.category
            return (
              <Fragment key={g.category}>
                <tr className="border-b border-gray-100 cursor-pointer hover:bg-gray-50" onClick={() => setOpenCat(isOpen ? null : g.category)}>
                  <td className="py-1.5 px-2 text-gray-900">
                    <span className="text-gray-400 mr-1">{isOpen ? '\u25be' : '\u25b8'}</span>{g.category}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-gray-600">{g.count}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-gray-900 whitespace-nowrap">
                    <div>{'PHP ' + Math.round(g.total).toLocaleString('en-US')}</div>
                    <div className="text-gray-500">{'USD ' + Math.round(g.total / RATE).toLocaleString('en-US')}</div>
                  </td>
                </tr>
                {isOpen && g.rows.map((r: any, i: number) => (
                  <tr key={i} className="bg-gray-50 border-b border-gray-100">
                    <td className="py-1 px-2 pl-6">
                      <div className="text-gray-700">{r.vendor_payee || 'Unknown'}</div>
                      <div className="text-gray-400">{dateShort(r.transaction_date)}{r.description ? ' (' + r.description + ')' : ''}</div>
                    </td>
                    <td></td>
                    <td className="py-1 px-2 text-right tabular-nums text-gray-700 whitespace-nowrap align-top">{money(r.currency, r.amount)}</td>
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 font-medium">
            <td className="py-1.5 px-2 text-gray-900">Total</td>
            <td className="py-1.5 px-2"></td>
            <td className="py-1.5 px-2 text-right tabular-nums text-gray-900 whitespace-nowrap">{'PHP ' + Math.round(grand).toLocaleString('en-US')}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

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

function OutstandingOrdersTable({ records }: { records: any[] }) {
  if (!records || records.length === 0) {
    return <div className="text-sm text-gray-500">No active master orders.</div>
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead className="text-gray-700">
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-1 font-medium">Customer</th>
            <th className="text-left py-2 px-1 font-medium">Master order</th>
            <th className="text-right py-2 px-1 font-medium">Ordered</th>
            <th className="text-right py-2 px-1 font-medium">Delivered</th>
            <th className="text-right py-2 px-1 font-medium">Remaining</th>
            <th className="text-right py-2 px-1 font-medium">Remaining value</th>
            <th className="text-right py-2 px-1 font-medium">Deposit on file</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r: any, i: number) => {
            const ordered = Number(r.qty_ordered || 0)
            const delivered = Number(r.qty_delivered || 0)
            const remaining = Number(r.qty_remaining || 0)
            const unit = r.quantity_unit || 'units'
            const cur = r.currency || 'PHP'
            const progress = ordered > 0 ? Math.round((delivered / ordered) * 100) : 0
            return (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1.5 px-1 text-gray-900">{r.customer_name || 'Unknown'}</td>
                <td className="py-1.5 px-1 text-gray-700">{r.master_invoice_number || '-'}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-gray-900">{ordered.toLocaleString()} {unit}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-gray-700">
                  {delivered.toLocaleString()} ({progress}%)
                </td>
                <td className="py-1.5 px-1 text-right tabular-nums font-medium text-gray-900">{remaining.toLocaleString()} {unit}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-gray-900">{cur} {Number(r.remaining_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-emerald-700">{cur} {Number(r.deposit_on_file || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
