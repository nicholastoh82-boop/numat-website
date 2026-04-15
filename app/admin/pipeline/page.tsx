'use client'

import React from 'react'
import useSWR from 'swr'
import { Loader2, TrendingUp, Users, BarChart2, Award, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminRole } from '@/app/admin/layout'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Types ───────────────────────────────────────────────────────────────────
type StageRow = {
  stage: string
  deal_count: number
  total_value_php: string | null
  total_value_usd: string | null
  weighted_value_usd: string | null
  avg_probability: string | null
}

type SegmentRow = {
  segment: string
  deal_count: number
  won_count: number
  total_value_usd: string | null
}

type RepRow = {
  rep: string
  deal_count: number
  won_count: number
  total_value_usd: string | null
}

type PipelineData = {
  byStage: StageRow[]
  bySegment: SegmentRow[]
  byRep: RepRow[]
  repSummary?: {
    total: number
    replied: number
    meetings: number
    won: number
  }
}

// ─── Colour maps ─────────────────────────────────────────────────────────────
const STAGE_BAR_COLORS: Record<string, string> = {
  'Lead': 'bg-slate-400',
  'Contacted': 'bg-blue-400',
  'Interested': 'bg-cyan-400',
  'Proposal Sent': 'bg-violet-500',
  'Meeting Booked': 'bg-amber-400',
  'Negotiating': 'bg-orange-400',
  'Won': 'bg-emerald-500',
  'Lost': 'bg-red-400',
  'Not Interested': 'bg-gray-300',
}

function formatUSD(val: string | null) {
  if (!val) return null
  const n = parseFloat(val)
  if (isNaN(n)) return null
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <div className={cn(
      'bg-card border rounded-xl p-5',
      accent ? 'border-primary/30 bg-primary/5' : 'border-border'
    )}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={cn('w-4 h-4', accent ? 'text-primary' : 'text-muted-foreground')} />
      </div>
      <p className={cn('font-serif text-2xl mt-2', accent ? 'text-primary' : 'text-foreground')}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ─── Pipeline Page ────────────────────────────────────────────────────────────
export default function AdminPipelinePage() {
  const { role } = useAdminRole()

  const { data, isLoading } = useSWR<PipelineData>('/api/admin/pipeline', fetcher, {
    revalidateOnFocus: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No pipeline data available
      </div>
    )
  }

  const { byStage, bySegment, byRep } = data

  // Total counts
  const totalLeads = byStage.reduce((s, r) => s + r.deal_count, 0)
  const wonRow = byStage.find(r => r.stage === 'Won')
  const proposalRow = byStage.find(r => r.stage === 'Proposal Sent')
  const meetingRow = byStage.find(r => r.stage === 'Meeting Booked')
  const contactedRow = byStage.find(r => r.stage === 'Contacted')

  const maxStageCount = Math.max(...byStage.map(r => r.deal_count), 1)
  const maxSegmentCount = Math.max(...bySegment.map(r => r.deal_count), 1)

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-foreground">Pipeline</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {role === 'rep' ? 'Your deals and activity' : 'Full pipeline overview'}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total in Pipeline"
          value={totalLeads.toLocaleString()}
          icon={Users}
          sub="All active leads"
        />
        <StatCard
          label="Contacted"
          value={contactedRow?.deal_count?.toLocaleString() ?? '0'}
          icon={TrendingUp}
          sub="Outreach sent"
        />
        <StatCard
          label="Proposals Sent"
          value={proposalRow?.deal_count?.toLocaleString() ?? '0'}
          icon={Target}
          sub={formatUSD(proposalRow?.total_value_usd ?? null) ?? 'No value set'}
          accent={!!proposalRow?.deal_count}
        />
        <StatCard
          label="Won"
          value={wonRow?.deal_count?.toLocaleString() ?? '0'}
          icon={Award}
          sub={formatUSD(wonRow?.total_value_usd ?? null) ?? 'No value set'}
          accent={!!wonRow?.deal_count}
        />
      </div>

      {/* Stage Funnel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Pipeline by Stage</h2>
        </div>
        <div className="p-5 space-y-3">
          {byStage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No stage data yet</p>
          ) : (
            byStage
              .filter(r => r.deal_count > 0)
              .sort((a, b) => b.deal_count - a.deal_count)
              .map(row => {
                const pct = Math.max(4, (row.deal_count / maxStageCount) * 100)
                return (
                  <div key={row.stage} className="flex items-center gap-4">
                    <div className="w-32 shrink-0 text-sm font-medium text-foreground">{row.stage}</div>
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full flex items-center px-3 transition-all',
                          STAGE_BAR_COLORS[row.stage] ?? 'bg-primary'
                        )}
                        style={{ width: `${pct}%` }}
                      >
                        <span className="text-white text-xs font-semibold whitespace-nowrap">
                          {row.deal_count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-20 shrink-0 text-right">
                      {row.total_value_usd ? (
                        <span className="text-sm font-medium text-foreground">
                          {formatUSD(row.total_value_usd)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </div>

      {/* Bottom Grid: By Segment + By Rep */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* By Segment */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">By Segment</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Lead volume per industry segment</p>
          </div>
          <div className="p-5 space-y-3">
            {bySegment
              .filter(r => SEGMENTS_CLEAN.includes(r.segment) || r.won_count > 0)
              .sort((a, b) => b.deal_count - a.deal_count)
              .slice(0, 8)
              .map(row => {
                const pct = Math.max(4, (row.deal_count / maxSegmentCount) * 100)
                return (
                  <div key={row.segment} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate">{row.segment}</span>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-muted-foreground">{row.deal_count.toLocaleString()}</span>
                        {row.won_count > 0 && (
                          <span className="text-emerald-600 font-medium">{row.won_count} won</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-muted rounded-full h-2">
                      <div
                        className="bg-primary/70 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* By Rep */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">By Sales Rep</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Lead assignment and performance</p>
          </div>
          <div className="p-5">
            {byRep.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No rep data yet</p>
            ) : (
              <div className="space-y-4">
                {byRep
                  .filter(r => r.rep)
                  .sort((a, b) => b.deal_count - a.deal_count)
                  .map(row => (
                    <div key={row.rep} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {row.rep.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{row.rep}</span>
                          <span className="text-xs text-muted-foreground">{row.deal_count.toLocaleString()} leads</span>
                        </div>
                        <div className="bg-muted rounded-full h-2">
                          <div
                            className="bg-primary/70 h-full rounded-full"
                            style={{ width: `${Math.max(4, (row.deal_count / Math.max(...byRep.map(r => r.deal_count), 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {row.won_count > 0 && (
                          <span className="text-xs font-medium text-emerald-600">{row.won_count} won</span>
                        )}
                        {row.total_value_usd && (
                          <p className="text-xs text-muted-foreground">{formatUSD(row.total_value_usd)}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const SEGMENTS_CLEAN = [
  'Hotel / Resort', 'Architects', 'Construction', 'Interior Designers',
  'Furniture Makers', 'Wood Distributors', 'Property Developer', 'B2C', 'Manufacturing',
]