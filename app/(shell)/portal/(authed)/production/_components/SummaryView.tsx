'use client'
import { useEffect, useState } from 'react'

type Summary = {
  period_days: number
  since: string
  totals: {
    slats_received: number; slats_passed: number; slats_rejected: number
    veneers_produced: number; veneers_sanded_passed: number
    boards_produced: number; boards_passed: number
  }
  yield: {
    qa_pass_rate_pct: number; slats_per_veneer: number
    veneer_sand_pass_rate_pct: number; board_pass_rate_pct: number; overall_yield_pct: number
  }
  downtime_minutes: { rough_planing: number; fine_planing: number; gluing: number; boards: number }
  defects: Record<string, number>
  moisture: { avg_incoming_pct: number | null; avg_pre_press_pct: number | null }
  press_avg: { platen_temp_c: number | null; pressure_bar: number | null; press_time_min: number | null }
  daily_trend: { date: string; boards: number }[]
  boards_by_sku: Record<string, { produced: number; passed: number; defects: number }>
  borax: { batches_tested: number; batches_flagged_for_review: number; slats_pass: number; slats_fail: number }
}

const fmt = (n: number | null | undefined, suffix = '') => n === null || n === undefined ? '—' : `${(Math.round(n * 10) / 10).toLocaleString()}${suffix}`

export default function SummaryView({ refreshKey }: { refreshKey: number }) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/production/summary?days=${days}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled) setData(j) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days, refreshKey])

  if (loading && !data) return <p className="text-sm text-gray-500">Loading.</p>
  if (!data) return <p className="text-sm text-gray-500">No data yet.</p>

  const downtimeTotal = data.downtime_minutes.rough_planing + data.downtime_minutes.fine_planing + data.downtime_minutes.gluing + data.downtime_minutes.boards
  const defectEntries = Object.entries(data.defects).filter(([_, n]) => n > 0).sort(([, a], [, b]) => b - a)
  const totalDefects = defectEntries.reduce((s, [, n]) => s + n, 0)
  const skuEntries = Object.entries(data.boards_by_sku).sort(([, a], [, b]) => b.passed - a.passed)
  const maxDailyBoards = Math.max(1, ...data.daily_trend.map(d => d.boards))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Summary</h2>
          <p className="text-xs text-gray-500 mt-0.5">Aggregates from {data.since} to today.</p>
        </div>
        <div className="flex gap-1 border border-gray-200 rounded p-0.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded ${days === d ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Yield KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Slats received" value={data.totals.slats_received.toLocaleString()} sub={`${fmt(data.yield.qa_pass_rate_pct, '%')} pass rate`} />
        <Kpi label="Veneers produced" value={data.totals.veneers_produced.toLocaleString()} sub={`${fmt(data.yield.slats_per_veneer)} slats/veneer`} />
        <Kpi label="Boards passed" value={data.totals.boards_passed.toLocaleString()} sub={`${fmt(data.yield.board_pass_rate_pct, '%')} board yield`} />
        <Kpi label="Overall yield" value={fmt(data.yield.overall_yield_pct, '%')} sub="Slats received → boards passed" accent="emerald" />
        <Kpi label="Total downtime" value={`${downtimeTotal} min`} sub="All stations" accent={downtimeTotal > 0 ? 'amber' : 'gray'} />
      </div>

      {/* Daily output trend (simple bar chart) */}
      <Section title="Daily board output">
        {data.daily_trend.length === 0 ? (
          <p className="text-xs text-gray-500">No board runs in this period.</p>
        ) : (
          <div className="flex items-end gap-1 h-32 border-b border-gray-200 overflow-x-auto pb-1">
            {data.daily_trend.map(d => (
              <div key={d.date} className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: 28 }}>
                <div className="text-[10px] text-gray-500 tabular-nums">{d.boards}</div>
                <div className="bg-emerald-500 w-6 rounded-t" style={{ height: `${(d.boards / maxDailyBoards) * 100}%` }} title={`${d.date}: ${d.boards} boards`} />
                <div className="text-[9px] text-gray-400 -rotate-45 origin-left whitespace-nowrap mt-2">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Boards by SKU */}
      <Section title="Boards by SKU">
        {skuEntries.length === 0 ? (
          <p className="text-xs text-gray-500">No boards produced in this period.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="text-xs text-gray-500 border-b border-gray-200">
                <tr><th className="text-left py-2 px-3">SKU</th><th className="text-right py-2 px-3">Pressed</th><th className="text-right py-2 px-3">Passed</th><th className="text-right py-2 px-3">Defects</th><th className="text-right py-2 px-3">Yield</th></tr>
              </thead>
              <tbody>
                {skuEntries.map(([sku, v]) => (
                  <tr key={sku} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-mono text-xs">{sku}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{v.produced.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold">{v.passed.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-red-600">{v.defects.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{v.produced > 0 ? `${Math.round((v.passed / v.produced) * 1000) / 10}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Two-column on md+: Defect breakdown + Downtime */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Defect breakdown" subtitle={totalDefects > 0 ? `${totalDefects} total across all stations` : undefined}>
          {defectEntries.length === 0 ? (
            <p className="text-xs text-gray-500">No defects logged.</p>
          ) : (
            <div className="space-y-1.5">
              {defectEntries.map(([cat, n]) => (
                <div key={cat} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 text-gray-700">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded h-4 relative overflow-hidden">
                    <div className="bg-red-400 h-full" style={{ width: `${(n / totalDefects) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right tabular-nums font-semibold">{n}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Downtime by station" subtitle={`${downtimeTotal} minutes total`}>
          <div className="space-y-2 text-sm">
            <DowntimeRow label="Rough planing" min={data.downtime_minutes.rough_planing} total={downtimeTotal} />
            <DowntimeRow label="Fine planing" min={data.downtime_minutes.fine_planing} total={downtimeTotal} />
            <DowntimeRow label="Gluing / 1st press" min={data.downtime_minutes.gluing} total={downtimeTotal} />
            <DowntimeRow label="Board press" min={data.downtime_minutes.boards} total={downtimeTotal} />
          </div>
        </Section>
      </div>

      {/* Engineering data row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Moisture content" subtitle="Targets: incoming ≤14%, pre-press 8-12%">
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Avg incoming MC" value={fmt(data.moisture.avg_incoming_pct, '%')} sub="From slat receipts" accent={data.moisture.avg_incoming_pct && data.moisture.avg_incoming_pct > 14 ? 'red' : 'blue'} />
            <Kpi label="Avg pre-press MC" value={fmt(data.moisture.avg_pre_press_pct, '%')} sub="From gluing" accent={data.moisture.avg_pre_press_pct && (data.moisture.avg_pre_press_pct > 12 || data.moisture.avg_pre_press_pct < 8) ? 'red' : 'blue'} />
          </div>
        </Section>

        <Section title="Press parameters (averages)">
          <div className="grid grid-cols-3 gap-2">
            <Kpi label="Platen °C" value={fmt(data.press_avg.platen_temp_c, '°')} accent="amber" />
            <Kpi label="Pressure" value={fmt(data.press_avg.pressure_bar, ' bar')} accent="amber" />
            <Kpi label="Press time" value={fmt(data.press_avg.press_time_min, ' min')} accent="amber" />
          </div>
        </Section>
      </div>

      {/* Borax treatment verification */}
      <Section title="Borax treatment verification" subtitle="Turmeric + ethanol test on 5% sample of each delivery">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Batches tested" value={String(data.borax.batches_tested)} accent={data.borax.batches_tested > 0 ? 'emerald' : 'gray'} />
          <Kpi label="Batches flagged" value={String(data.borax.batches_flagged_for_review)} accent={data.borax.batches_flagged_for_review > 0 ? 'red' : 'gray'} sub="Awaiting Mark or Bryan review" />
          <Kpi label="Slats passed" value={data.borax.slats_pass.toLocaleString()} accent="emerald" sub="Color changed" />
          <Kpi label="Slats failed" value={data.borax.slats_fail.toLocaleString()} accent={data.borax.slats_fail > 0 ? 'red' : 'gray'} sub="No color change" />
        </div>
      </Section>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Kpi({ label, value, sub, accent = 'gray' }: { label: string; value: string; sub?: string; accent?: 'gray' | 'emerald' | 'amber' | 'red' | 'blue' }) {
  const colors = {
    gray: 'bg-white border-gray-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
  }[accent]
  return (
    <div className={`rounded-lg border p-3 ${colors}`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function DowntimeRow({ label, min, total }: { label: string; min: number; total: number }) {
  const pct = total > 0 ? (min / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 shrink-0 text-gray-700">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-4 relative overflow-hidden">
        <div className="bg-amber-400 h-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right tabular-nums font-semibold">{min} min</span>
    </div>
  )
}
