'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
  company: string | null
  country: string | null
  city: string | null
  phone: string | null
  segment: string | null
  status: string | null
  pipeline_stage: string | null
  rep_assigned: string | null
  rep_email: string | null
  priority_tier: string | null
  notes: string | null
  deal_value_php: number | null
  deal_value_usd: number | null
  quoted_at: string | null
  quote_currency: string | null
  quote_notes: string | null
  quote_issued_by: string | null
  last_activity_at: string | null
  created_at: string
  title?: string | null
  website?: string | null
  linkedin_url?: string | null
  email_sent_at?: string | null
  replied_at?: string | null
  last_email_sent?: string | null
  last_activity_type?: string | null
  reply_classification?: string | null
  appointment_date?: string | null
  close_date?: string | null
  follow_up?: string | null
  booking_confirmed?: boolean | null
  won_lost?: string | null
  qty?: number | null
  unit?: string | null
  meeting_link?: string | null
  last_rep_touch_at?: string | null
  last_rep_touch_by?: string | null
  last_rep_touch_subject?: string | null
  rep_reply_count?: number | null
}

interface CRMUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
}

const PIPELINE_STAGES = ['new','contacted','qualified','proposal_sent','meeting_booked','won','lost']
const STATUS_OPTIONS = ['pending','active','replied','nurturing','booking_sent','booked','closed','cold_close','bounced','unsubscribed']

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-purple-100 text-purple-700',
  proposal_sent: 'bg-amber-100 text-amber-700',
  meeting_booked: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  meeting_booked: 'Meeting Booked',
  won: 'Won',
  lost: 'Lost',
}

const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-green-100 text-green-700',
  closed: 'bg-green-100 text-green-700',
  bounced: 'bg-red-100 text-red-700',
  unsubscribed: 'bg-red-100 text-red-700',
}

const REPLY_CLASSIFICATIONS = ['interested','not_interested','out_of_office','wrong_person','request_info','unsubscribed']

const formatStatusLabel = (s: string) => s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())

function relDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays < 1) return 'Today'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })
}

function mostRecent(...isos: (string | null | undefined)[]): string | null {
  const valid = isos.filter(Boolean) as string[]
  if (valid.length === 0) return null
  return valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
}

const PHP_TO_USD = 56 // ₱/USD rate

export default function CRMDashboard() {
  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
  const router = useRouter()

  const [user, setUser] = useState<CRMUser | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [repFilter, setRepFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [quoteModal, setQuoteModal] = useState<Lead | null>(null)
  const [quoteForm, setQuoteForm] = useState({ amountPHP: '', amountUSD: '', notes: '' })
  const [quoteSubmitting, setQuoteSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(true)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/crm/login'); return null }
    const { data } = await supabase.from('crm_users').select('*').eq('email', authUser.email).single()
    if (!data) { router.push('/crm/login'); return null }
    setUser(data)
    return data as CRMUser
  }, [supabase, router])

  const loadLeads = useCallback(async (crmUser: CRMUser) => {
    const SELECT_FIELDS = 'id,first_name,last_name,full_name,email,company,country,city,phone,segment,status,pipeline_stage,rep_assigned,rep_email,priority_tier,notes,deal_value_php,deal_value_usd,quoted_at,quote_currency,quote_notes,quote_issued_by,last_activity_at,created_at,title,website,linkedin_url,email_sent_at,replied_at,last_email_sent,last_activity_type,reply_classification,appointment_date,close_date,follow_up,booking_confirmed,won_lost,qty,unit,meeting_link,last_rep_touch_at,last_rep_touch_by,last_rep_touch_subject,rep_reply_count'
    const PAGE_SIZE = 1000
    const allLeads: Lead[] = []
    let from = 0
    let keepFetching = true

    while (keepFetching) {
      let query = supabase
        .from('master_leads')
        .select(SELECT_FIELDS)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (crmUser.role === 'rep') {
        query = query.eq('rep_email', crmUser.email)
      }

      const { data, error } = await query
      if (error) { showToast('Failed to load leads', 'error'); return }
      if (!data || data.length === 0) break
      allLeads.push(...data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    setLeads(allLeads)
  }, [supabase])

  const refresh = async () => {
    if (!user) return
    setRefreshing(true)
    await loadLeads(user)
    setRefreshing(false)
  }

  useEffect(() => {
    setLoading(true)
    loadUser().then(u => {
      if (u) loadLeads(u).then(() => setLoading(false))
      else setLoading(false)
    })
  }, [loadUser, loadLeads])

  useEffect(() => {
    let result = [...leads]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        [l.full_name, l.first_name, l.last_name, l.company, l.email, l.city, l.segment]
          .some(v => v?.toLowerCase().includes(q))
      )
    }
    if (stageFilter !== 'all') result = result.filter(l => l.pipeline_stage === stageFilter)
    if (repFilter !== 'all') result = result.filter(l => l.rep_email === repFilter)
    setFiltered(result)
  }, [leads, search, stageFilter, repFilter])

  const updateLead = async (id: string, updates: Record<string, unknown>) => {
    setSaving(id)
    const { error } = await supabase
      .from('master_leads')
      .update({ ...updates, last_activity_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { showToast('Failed to save', 'error') }
    else { setLeads(prev => prev.map(l => l.id === id ? { ...l, ...(updates as Partial<Lead>) } : l)) }
    setSaving(null)
  }

  const openQuoteModal = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation()
    setQuoteModal(lead)
    setQuoteForm({ amountPHP: lead.deal_value_php?.toString() || '', amountUSD: lead.deal_value_usd?.toString() || '', notes: '' })
  }

  const handlePHPChange = (val: string) => {
    const php = parseFloat(val)
    setQuoteForm(f => ({ ...f, amountPHP: val, amountUSD: val && !isNaN(php) ? (php / PHP_TO_USD).toFixed(2) : f.amountUSD }))
  }

  const submitQuote = async () => {
    if (!quoteModal || !user || !quoteForm.amountPHP) return
    setQuoteSubmitting(true)
    const updates = {
      pipeline_stage: 'proposal_sent', status: 'active',
      deal_value_php: parseFloat(quoteForm.amountPHP) || null,
      deal_value_usd: parseFloat(quoteForm.amountUSD) || null,
      quoted_at: new Date().toISOString(), quote_currency: 'PHP',
      quote_notes: quoteForm.notes || null, quote_issued_by: user.email,
      last_activity_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('master_leads').update(updates).eq('id', quoteModal.id)
    if (error) { showToast('Failed to issue quote', 'error') }
    else {
      setLeads(prev => prev.map(l => l.id === quoteModal.id ? { ...l, ...updates } : l))
      showToast('Quote issued for ' + (quoteModal.company || quoteModal.full_name))
      setQuoteModal(null)
      setQuoteForm({ amountPHP: '', amountUSD: '', notes: '' })
    }
    setQuoteSubmitting(false)
  }

  const signOut = async () => { await supabase.auth.signOut(); router.push('/crm/login') }
  const repOptions = Array.from(new Set(leads.map(l => l.rep_email).filter(Boolean))) as string[]
  const segmentOptions = Array.from(new Set(leads.map(l => l.segment).filter(Boolean))) as string[]

  const analytics = useMemo(() => {
    const byAgent = new Map<string, number>()
    const bySegment = new Map<string, number>()
    const byCountry = new Map<string, number>()
    const byStage = new Map<string, number>()
    const byStatus = new Map<string, number>()
    for (const l of leads) {
      const agent = l.rep_email || 'unassigned'
      byAgent.set(agent, (byAgent.get(agent) || 0) + 1)
      const seg = l.segment || 'Unspecified'
      bySegment.set(seg, (bySegment.get(seg) || 0) + 1)
      const country = l.country || 'Unknown'
      byCountry.set(country, (byCountry.get(country) || 0) + 1)
      const stage = l.pipeline_stage || 'new'
      byStage.set(stage, (byStage.get(stage) || 0) + 1)
      const status = l.status || 'pending'
      byStatus.set(status, (byStatus.get(status) || 0) + 1)
    }
    const sortDesc = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1])
    return {
      total: leads.length,
      byAgent: sortDesc(byAgent),
      bySegment: sortDesc(bySegment),
      byCountry: sortDesc(byCountry).slice(0, 10),
      byStage: PIPELINE_STAGES.map(s => [s, byStage.get(s) || 0] as [string, number]),
      byStatus: STATUS_OPTIONS.map(s => [s, byStatus.get(s) || 0] as [string, number]),
    }
  }, [leads])

  const stats = {
    total: filtered.length,
    active: filtered.filter(l => ['active','replied','nurturing'].includes(l.status || '')).length,
    quoted: filtered.filter(l => l.pipeline_stage === 'proposal_sent').length,
    won: filtered.filter(l => l.pipeline_stage === 'won').length,
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading leads...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'N'}
            </div>
            <span className="font-semibold text-gray-800">NUMAT CRM</span>
            <span className="text-gray-400 text-sm hidden sm:block">{user?.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {user?.role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} disabled={refreshing} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 text-lg leading-none disabled:opacity-40" title="Refresh">
              {refreshing ? '⟳' : '↻'}
            </button>
            <button onClick={signOut} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Sign out">⎋</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {user?.role === 'admin' && (
          <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
            <button
              onClick={() => setAnalyticsOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-700" />
                <span className="font-semibold text-gray-800">Analytics</span>
                <span className="text-xs text-gray-400">{analytics.total.toLocaleString()} total leads</span>
              </div>
              <span className="text-gray-400 text-sm">{analyticsOpen ? '▲' : '▼'}</span>
            </button>
            {analyticsOpen && (
              <div className="border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">Total Leads</div>
                  <div className="text-3xl font-bold text-green-700">{analytics.total.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">By Agent</div>
                  <ul className="space-y-1 text-sm">
                    {analytics.byAgent.length === 0 && <li className="text-gray-400 text-xs">No data</li>}
                    {analytics.byAgent.map(([agent, count]) => (
                      <li key={agent} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{agent === 'unassigned' ? 'Unassigned' : agent.split('@')[0]}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">By Segment</div>
                  <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                    {analytics.bySegment.length === 0 && <li className="text-gray-400 text-xs">No data</li>}
                    {analytics.bySegment.map(([seg, count]) => (
                      <li key={seg} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{seg}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">Top 10 Countries</div>
                  <ul className="space-y-1 text-sm">
                    {analytics.byCountry.length === 0 && <li className="text-gray-400 text-xs">No data</li>}
                    {analytics.byCountry.map(([country, count]) => (
                      <li key={country} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{country}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">By Pipeline Stage</div>
                  <ul className="space-y-1 text-sm">
                    {analytics.byStage.map(([stage, count]) => (
                      <li key={stage} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{STAGE_LABELS[stage] || stage}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">By Status</div>
                  <ul className="space-y-1 text-sm">
                    {analytics.byStatus.map(([status, count]) => (
                      <li key={status} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{formatStatusLabel(status)}</span>
                        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-5">
          <input type="text" placeholder="Search name, company, email, city..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-52 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          {user?.role === 'admin' && repOptions.length > 0 && (
            <select value={repFilter} onChange={e => setRepFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="all">All Reps</option>
              {repOptions.map(r => <option key={r} value={r}>{r.split('@')[0]}</option>)}
            </select>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-800' },
            { label: 'Active', value: stats.active, color: 'text-blue-700' },
            { label: 'Quoted', value: stats.quoted, color: 'text-amber-700' },
            { label: 'Won', value: stats.won, color: 'text-green-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No leads found</p>
              <p className="text-sm mt-1">Adjust your search or filters</p>
            </div>
          )}
          {filtered.map(lead => {
            const displayName = lead.first_name || lead.full_name?.split(' ')[0] || 'Unknown'
            const isExpanded = expandedId === lead.id
            const stageColor = STAGE_COLORS[lead.pipeline_stage || 'new'] || 'bg-gray-100 text-gray-600'
            const stageLabel = STAGE_LABELS[lead.pipeline_stage || 'new'] || lead.pipeline_stage || 'New'
            const statusColor = STATUS_COLORS[lead.status || ''] || 'bg-gray-100 text-gray-600'
            const lastContact = relDate(mostRecent(lead.last_activity_at, lead.last_email_sent))
            return (
              <div key={lead.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800">{displayName}</span>
                      {lead.company && <span className="text-gray-500 text-sm">{lead.company}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor}`}>{stageLabel}</span>
                      {lead.status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                          {formatStatusLabel(lead.status)}
                        </span>
                      )}
                      {lead.quoted_at && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          ₱{Number(lead.deal_value_php || 0).toLocaleString()} quoted
                        </span>
                      )}
                      {(lead.rep_reply_count || 0) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium" title={lead.last_rep_touch_subject || 'Rep outbound replies'}>
                          ✉ {lead.rep_reply_count} rep {lead.rep_reply_count === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {[lead.email, lead.city, lead.country].filter(Boolean).join(' · ')}
                      {lastContact && <span className="ml-2 text-gray-400">· {lastContact}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button onClick={e => openQuoteModal(lead, e)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${lead.quoted_at ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}>
                      {lead.quoted_at ? '↺ Requote' : '+ Issue Quote'}
                    </button>
                    <span className="text-gray-300 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/70">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Pipeline Stage</label>
                        <select defaultValue={lead.pipeline_stage || 'new'}
                          onChange={e => updateLead(lead.id, { pipeline_stage: e.target.value })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Email Status</label>
                        <select defaultValue={lead.status || 'pending'}
                          onChange={e => updateLead(lead.id, { status: e.target.value })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Value (PHP)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                          <input type="number" defaultValue={lead.deal_value_php || ''}
                            onBlur={e => updateLead(lead.id, { deal_value_php: parseFloat(e.target.value) || null })}
                            placeholder="0" className="w-full border border-gray-200 bg-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Value (USD)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" defaultValue={lead.deal_value_usd || ''}
                            onBlur={e => updateLead(lead.id, { deal_value_usd: parseFloat(e.target.value) || null })}
                            placeholder="0" className="w-full border border-gray-200 bg-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Phone</label>
                        <input type="text" defaultValue={lead.phone || ''} placeholder="+63..."
                          onBlur={e => updateLead(lead.id, { phone: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Title / Role</label>
                        <input type="text" defaultValue={lead.title || ''} placeholder="e.g. Project Manager"
                          onBlur={e => updateLead(lead.id, { title: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Segment</label>
                        <select defaultValue={lead.segment || ''}
                          onChange={e => updateLead(lead.id, { segment: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option value="">— None —</option>
                          {segmentOptions.map(s => <option key={s} value={s}>{s}</option>)}
                          {lead.segment && !segmentOptions.includes(lead.segment) && (
                            <option value={lead.segment}>{lead.segment}</option>
                          )}
                        </select>
                      </div>
                      {user?.role === 'admin' && (
                        <div>
                          <label className="text-xs font-medium text-gray-400 block mb-1">Rep Assigned</label>
                          <select defaultValue={lead.rep_email || ''}
                            onChange={e => {
                              const email = e.target.value
                              const repNameMap: Record<string,string> = {
                                'mohan@numat.ph': 'Mohan',
                                'bryan@numat.ph': 'Bryan',
                              }
                              const name = repNameMap[email] || email.split('@')[0]
                              updateLead(lead.id, {
                                rep_email: email || null,
                                rep_assigned: email ? name : null,
                                rep_reply_to: email || null,
                              })
                            }}
                            className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">— Unassigned —</option>
                            <option value="mohan@numat.ph">Mohan (International)</option>
                            <option value="bryan@numat.ph">Bryan (Philippines)</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Reply Classification</label>
                        <select defaultValue={lead.reply_classification || ''}
                          onChange={e => updateLead(lead.id, { reply_classification: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option value="">— None —</option>
                          {REPLY_CLASSIFICATIONS.map(c => <option key={c} value={c}>{formatStatusLabel(c)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Appointment Date</label>
                        <input type="date" defaultValue={lead.appointment_date ? lead.appointment_date.slice(0, 10) : ''}
                          onBlur={e => updateLead(lead.id, { appointment_date: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Close Date</label>
                        <input type="date" defaultValue={lead.close_date ? lead.close_date.slice(0, 10) : ''}
                          onBlur={e => updateLead(lead.id, { close_date: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">Follow Up</label>
                        <input type="text" defaultValue={lead.follow_up || ''} placeholder="e.g. Call back 20 Apr"
                          onBlur={e => updateLead(lead.id, { follow_up: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <label className="text-xs font-medium text-gray-400 block mb-1">Notes</label>
                        <textarea defaultValue={lead.notes || ''} rows={2} placeholder="Add notes..."
                          onBlur={e => updateLead(lead.id, { notes: e.target.value })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                      </div>
                    </div>
                    {lead.quoted_at && (
                      <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 flex items-start gap-2">
                        <span>📋</span>
                        <span>
                          Quote issued {new Date(lead.quoted_at).toLocaleDateString('en-PH',{day:'numeric',month:'short',year:'numeric'})}
                          {lead.quote_issued_by && ' by ' + lead.quote_issued_by.split('@')[0]}
                          {lead.deal_value_php && ' · ₱' + Number(lead.deal_value_php).toLocaleString()}
                          {lead.deal_value_usd && ' / \u0024' + Number(lead.deal_value_usd).toLocaleString()}
                          {lead.quote_notes && ' · ' + lead.quote_notes}
                        </span>
                      </div>
                    )}
                    {(lead.rep_reply_count || 0) > 0 && lead.last_rep_touch_at && (
                      <div className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                        <span>✉</span>
                        <span>
                          Last rep reply {relDate(lead.last_rep_touch_at)}
                          {lead.last_rep_touch_by && ' by ' + lead.last_rep_touch_by.split('@')[0]}
                          {' · ' + lead.rep_reply_count + ' total ' + (lead.rep_reply_count === 1 ? 'reply' : 'replies')}
                          {lead.last_rep_touch_subject && (
                            <span className="block mt-1 text-emerald-700/80 italic truncate">“{lead.last_rep_touch_subject}”</span>
                          )}
                        </span>
                      </div>
                    )}
                    {saving === lead.id && <p className="text-xs text-green-600 mt-2 animate-pulse">Saving...</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {quoteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Issue Quotation</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {quoteModal.full_name || [quoteModal.first_name, quoteModal.last_name].filter(Boolean).join(' ')}
                {quoteModal.company && ' · ' + quoteModal.company}
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Quoted Amount (PHP) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
                  <input type="number" value={quoteForm.amountPHP} onChange={e => handlePHPChange(e.target.value)}
                    placeholder="0.00" autoFocus
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">USD Equivalent</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input type="number" value={quoteForm.amountUSD} onChange={e => setQuoteForm(f => ({ ...f, amountUSD: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Auto-calculated at ₱{PHP_TO_USD}/USD. Adjust if needed.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Quote Notes</label>
                <textarea value={quoteForm.notes} onChange={e => setQuoteForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="Products quoted, scope, special terms, delivery timeline..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              <div className="bg-green-50 rounded-xl px-4 py-3 text-xs text-green-700">
                Submitting will set this lead to <strong>Proposal Sent</strong>, record the amount and date, and log your name as the issuer.
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setQuoteModal(null); setQuoteForm({ amountPHP: '', amountUSD: '', notes: '' }) }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={submitQuote} disabled={!quoteForm.amountPHP || quoteSubmitting}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {quoteSubmitting ? 'Saving...' : 'Issue Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

