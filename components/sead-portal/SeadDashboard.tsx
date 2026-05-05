'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  company: string | null
  country: string | null
  segment: string | null
  sub_segment: string | null
  rep_assigned: string | null
  pipeline_stage: string | null
  status: string | null
  source: string | null
  source_payload: any
  created_at: string | null
  last_activity_at: string | null
  last_activity_type: string | null
  notes: string | null
}

interface Props {
  leads: Lead[]
  error: string | null
}

export default function SeadDashboard({ leads, error }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const logout = async () => {
    await fetch('/api/sead-portal/auth', { method: 'DELETE' })
    router.refresh()
  }

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = filter === 'all'
    ? leads
    : leads.filter(l => (l.pipeline_stage || l.status || 'new').toLowerCase() === filter)

  const counts = {
    all: leads.length,
    new: leads.filter(l => (l.pipeline_stage || l.status || 'new').toLowerCase() === 'new').length,
    inquiry: leads.filter(l => (l.pipeline_stage || '').toLowerCase() === 'inquiry').length,
    contacted: leads.filter(l => (l.pipeline_stage || '').toLowerCase() === 'contacted').length,
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-widest text-emerald-700">NUMAT and SEAD</div>
            <h1 className="text-xl font-bold text-gray-900">Partner Portal</h1>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Form Submissions</h2>
          <p className="text-sm text-gray-500">
            Live feed of leads who completed the NUMAT and SEAD qualification form. Read only.
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'new', label: `New (${counts.new})` },
            { key: 'inquiry', label: `Inquiry (${counts.inquiry})` },
            { key: 'contacted', label: `Contacted (${counts.contacted})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${
                filter === f.key
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No submissions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(lead => {
              const sp = lead.source_payload || {}
              const expanded = expandedIds.has(lead.id)
              const stage = lead.pipeline_stage || lead.status || 'new'
              const arr = (v: any) => Array.isArray(v) ? v.join(', ') : (v || '—')
              const txt = (v: any) => v && String(v).trim() ? String(v) : '—'

              return (
                <div key={lead.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <button
                    onClick={() => toggle(lead.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="font-semibold text-gray-900 truncate">{lead.full_name || lead.email || 'Unnamed'}</div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          stage === 'new' ? 'bg-blue-100 text-blue-800'
                          : stage === 'contacted' ? 'bg-amber-100 text-amber-800'
                          : stage === 'qualified' ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                        }`}>{stage}</span>
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {lead.company || '—'} · {arr(sp.project_types)} · {txt(sp.budget_range)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <div className="text-xs text-gray-400">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                      </div>
                      <div className="text-gray-400 text-xs">{expanded ? '▾' : '▸'}</div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50">
                      <Section title="Contact">
                        <Row label="Name" value={txt(lead.full_name)} />
                        <Row label="Title" value={txt(lead.title)} />
                        <Row label="Company" value={txt(lead.company)} />
                        <Row label="Email" value={txt(lead.email)} />
                        <Row label="Phone" value={txt(lead.phone)} />
                        <Row label="Preferred contact" value={txt(sp.preferred_contact_method)} />
                        <Row label="Country" value={txt(lead.country)} />
                      </Section>

                      <Section title="Project">
                        <Row label="Project name" value={txt(sp.project_name)} />
                        <Row label="Project types" value={arr(sp.project_types)} />
                        <Row label="Project stages" value={arr(sp.project_stages)} />
                        <Row label="Support needed" value={arr(sp.support_types)} />
                        <Row label="Description" value={txt(sp.project_description)} multiline />
                      </Section>

                      <Section title="Qualification">
                        <Row label="Timeline" value={txt(sp.timeline)} />
                        <Row label="Budget range" value={txt(sp.budget_range)} />
                        <Row label="Sustainability priority" value={txt(sp.sustainability_importance)} />
                        <Row label="Site constraints" value={txt(sp.site_constraints)} multiline />
                        <Row label="Decision makers" value={txt(sp.decision_makers)} multiline />
                        <Row label="Wants consultation" value={txt(sp.follow_up_consultation)} />
                      </Section>

                      <Section title="NUMAT status">
                        <Row label="Pipeline stage" value={txt(lead.pipeline_stage)} />
                        <Row label="Assigned rep" value={txt(lead.rep_assigned)} />
                        <Row label="Last activity" value={lead.last_activity_at ? `${lead.last_activity_type || ''} ${new Date(lead.last_activity_at).toLocaleDateString('en-GB')}`.trim() : '—'} />
                        <Row label="Notes" value={txt(lead.notes)} multiline />
                      </Section>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0 pt-3">
      <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2 pb-1.5 border-b border-gray-200">
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={`mb-2 ${multiline ? 'block' : 'flex gap-3'}`}>
      <div className={`text-xs text-gray-500 font-medium ${multiline ? 'mb-1' : 'min-w-[160px]'}`}>{label}</div>
      <div className={`text-sm text-gray-900 flex-1 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</div>
    </div>
  )
}
