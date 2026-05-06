'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface Tender {
  id: string
  reference_number: string | null
  title: string | null
  agency: string | null
  category: string | null
  description: string | null
  approved_budget_php: number | null
  closing_date: string | null
  posted_date: string | null
  area_of_delivery: string | null
  philgeps_url: string | null
  status: 'new' | 'reviewed' | 'pursuing' | 'submitted' | 'won' | 'lost' | 'declined'
  numat_fit_score: number | null
  recommended_product: string | null
  ai_assessment: any
  assigned_to: string | null
  notes: string | null
  raw_email: string | null
  raw_email_received_at: string | null
  created_at: string
  updated_at: string | null
}

interface CRMUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
}

const ACTIVE_STATUSES = ['new', 'reviewed', 'pursuing'] as const

const TENDER_STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  reviewed: 'bg-blue-100 text-blue-700',
  pursuing: 'bg-amber-100 text-amber-700',
  submitted: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  declined: 'bg-gray-100 text-gray-500',
}

const TENDER_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  pursuing: 'Pursuing',
  submitted: 'Submitted',
  won: 'Won',
  lost: 'Lost',
  declined: 'Declined',
}

const REP_OPTIONS: Array<{ email: string; label: string }> = [
  { email: 'bryan@numat.ph', label: 'Bryan (Philippines)' },
  { email: 'eugene@numat.ph', label: 'Eugene (Philippines)' },
  { email: 'mohan@numat.ph', label: 'Mohan (International)' },
  { email: 'nick@numat.ph', label: 'Nick' },
]

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const target = new Date(iso)
  if (isNaN(target.getTime())) return null
  const now = new Date()
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tgtDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((tgtDay.getTime() - nowDay.getTime()) / 86_400_000)
}

function fmtPhp(n: number | null | undefined): string {
  if (n == null) return ''
  return `₱${Math.round(n).toLocaleString('en-PH')}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fitScoreClass(score: number | null | undefined): string {
  if (score == null) return ''
  if (score >= 8) return 'bg-green-100 text-green-700'
  if (score >= 5) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export default function TendersPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const router = useRouter()

  const [user, setUser] = useState<CRMUser | null>(null)
  const [tenders, setTenders] = useState<Tender[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Add tender modal
  const [addOpen, setAddOpen] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [newTender, setNewTender] = useState({
    title: '', agency: '', reference_number: '', closing_date: '',
    approved_budget_php: '', area_of_delivery: '', philgeps_url: '',
    description: '', notes: '',
  })

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

  const loadTenders = useCallback(async () => {
    const { data, error } = await supabase
      .from('numat_tenders')
      .select('*')
      .order('closing_date', { ascending: true })
    if (error) { showToast('Failed to load tenders', 'error'); return }
    setTenders((data || []) as Tender[])
  }, [supabase])

  const refresh = async () => {
    setRefreshing(true)
    await loadTenders()
    setRefreshing(false)
  }

  useEffect(() => {
    setLoading(true)
    loadUser().then(u => {
      if (u) loadTenders().then(() => setLoading(false))
      else setLoading(false)
    })
  }, [loadUser, loadTenders])

  const stats = useMemo(() => {
    const active = tenders.filter(t => (ACTIVE_STATUSES as readonly string[]).includes(t.status))
    const closingSoon = active.filter(t => {
      const d = daysUntil(t.closing_date)
      return d !== null && d >= 0 && d <= 7
    })
    const pursuing = tenders.filter(t => t.status === 'pursuing')
    const thisYear = new Date().getFullYear()
    const wonYtd = tenders.filter(t => {
      if (t.status !== 'won') return false
      const d = t.updated_at ? new Date(t.updated_at) : null
      return Boolean(d && !isNaN(d.getTime()) && d.getFullYear() === thisYear)
    })
    return {
      active: active.length,
      closingSoon: closingSoon.length,
      pursuing: pursuing.length,
      wonYtd: wonYtd.length,
    }
  }, [tenders])

  const filtered = useMemo(() => {
    let list = [...tenders]
    if (filter === 'active') {
      list = list.filter(t => (ACTIVE_STATUSES as readonly string[]).includes(t.status))
    } else if (filter === 'closing_soon') {
      list = list.filter(t => {
        if (!(ACTIVE_STATUSES as readonly string[]).includes(t.status)) return false
        const d = daysUntil(t.closing_date)
        return d !== null && d >= 0 && d <= 7
      })
    } else if (filter !== 'all') {
      list = list.filter(t => t.status === filter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        [t.title, t.agency, t.reference_number, t.area_of_delivery]
          .some(v => v?.toLowerCase().includes(q))
      )
    }

    const isPastTab = ['submitted', 'won', 'lost'].includes(filter)
    list.sort((a, b) => {
      const dateA = a.closing_date ? new Date(a.closing_date).getTime() : 0
      const dateB = b.closing_date ? new Date(b.closing_date).getTime() : 0
      return isPastTab ? dateB - dateA : dateA - dateB
    })
    return list
  }, [tenders, filter, search])

  const updateTender = async (id: string, updates: Record<string, unknown>) => {
    setSaving(id)
    const patch = { ...updates, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('numat_tenders').update(patch).eq('id', id)
    if (error) {
      showToast(`Failed to save: ${error.message}`, 'error')
    } else {
      setTenders(prev => prev.map(t => t.id === id ? { ...t, ...(patch as Partial<Tender>) } : t))
      if ('status' in updates) showToast(`Status updated to ${TENDER_STATUS_LABELS[updates.status as string] || updates.status}`)
    }
    setSaving(null)
  }

  const handleDecline = (id: string) => {
    if (!window.confirm('Decline this tender? It will be moved out of the active list.')) return
    updateTender(id, { status: 'declined' })
  }

  const submitNewTender = async () => {
    if (!newTender.title.trim()) { showToast('Title is required', 'error'); return }
    setAddSubmitting(true)
    const payload = {
      title: newTender.title.trim() || null,
      agency: newTender.agency.trim() || null,
      reference_number: newTender.reference_number.trim() || null,
      closing_date: newTender.closing_date ? new Date(newTender.closing_date).toISOString() : null,
      approved_budget_php: newTender.approved_budget_php ? Number(newTender.approved_budget_php) : null,
      area_of_delivery: newTender.area_of_delivery.trim() || null,
      philgeps_url: newTender.philgeps_url.trim() || null,
      description: newTender.description.trim() || null,
      notes: newTender.notes.trim() || null,
      status: 'new',
    }
    const { data, error } = await supabase
      .from('numat_tenders')
      .insert(payload)
      .select('*')
      .single()
    if (error) {
      showToast(`Failed to add tender: ${error.message}`, 'error')
    } else if (data) {
      setTenders(prev => [data as Tender, ...prev])
      showToast(`Tender added: ${(data as Tender).title}`)
      setAddOpen(false)
      setNewTender({
        title: '', agency: '', reference_number: '', closing_date: '',
        approved_budget_php: '', area_of_delivery: '', philgeps_url: '',
        description: '', notes: '',
      })
    }
    setAddSubmitting(false)
  }

  const signOut = async () => { await supabase.auth.signOut(); router.push('/crm/login') }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading tenders...</p>
      </div>
    </div>
  )

  const FILTER_TABS: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'closing_soon', label: 'Closing soon' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
  ]

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
            <span className="font-semibold text-gray-800">NUMAT Tenders</span>
            <span className="text-gray-400 text-sm hidden sm:block">{user?.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {user?.role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/crm/dashboard"
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 hidden sm:inline-flex items-center"
              title="Back to the CRM dashboard"
            >
              Back to CRM
            </a>
            {user?.is_active ? (
              <a
                href="/crm/schematic-estimator"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 hidden sm:inline-flex items-center"
                title="Materials estimator from schematic"
              >
                Schematic Estimator
              </a>
            ) : null}
            {user?.role === 'admin' && (
              <button
                onClick={() => setAddOpen(true)}
                className="px-3 py-1.5 bg-green-700 hover:bg-green-800 rounded-lg text-white text-xs font-medium flex items-center gap-1"
                title="Add a tender manually"
              >
                <span className="text-base leading-none">+</span> Add Tender
              </button>
            )}
            <button
              onClick={refresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 text-lg leading-none disabled:opacity-40"
              title="Refresh"
            >
              {refreshing ? '⟳' : '↻'}
            </button>
            <button onClick={signOut} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Sign out">⎋</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Active', value: stats.active, color: 'text-green-700' },
            { label: 'Closing this week', value: stats.closingSoon, color: 'text-amber-700' },
            { label: 'Pursuing', value: stats.pursuing, color: 'text-blue-700' },
            { label: 'Won YTD', value: stats.wonYtd, color: 'text-green-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {FILTER_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filter === t.key
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-5">
          <input
            type="text"
            placeholder="Search title, agency, reference, area..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No tenders found</p>
              <p className="text-sm mt-1">Adjust your search or filters</p>
            </div>
          )}
          {filtered.map(t => {
            const isExpanded = expandedId === t.id
            const days = daysUntil(t.closing_date)
            const statusColor = TENDER_STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-700'
            const statusLabel = TENDER_STATUS_LABELS[t.status] || t.status

            let closingNode: React.ReactNode = null
            if (days === null) {
              closingNode = <span className="text-xs text-gray-400">No closing date</span>
            } else if (days < 0) {
              closingNode = <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Closed</span>
            } else {
              const tone = days < 3 ? 'text-red-600 font-semibold' : days <= 7 ? 'text-amber-700 font-medium' : 'text-gray-500'
              const text = days === 0 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : `Closes in ${days} days`
              closingNode = <span className={`text-xs ${tone}`}>{text}</span>
            }

            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                      <span className="font-semibold text-gray-800 truncate">{t.title || '(untitled)'}</span>
                      {t.agency && <span className="text-gray-500 text-sm truncate">{t.agency}</span>}
                      {t.numat_fit_score != null && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${fitScoreClass(t.numat_fit_score)}`}
                          title="NUMAT fit score (0 to 10)"
                        >
                          Fit {t.numat_fit_score}
                        </span>
                      )}
                      {t.recommended_product && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                          {t.recommended_product}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                      {closingNode}
                      {t.closing_date && days !== null && days >= 0 && (
                        <span className="text-gray-400">· {fmtDate(t.closing_date)}</span>
                      )}
                      {t.approved_budget_php != null && (
                        <span className="text-gray-500">· {fmtPhp(t.approved_budget_php)}</span>
                      )}
                      {t.area_of_delivery && <span className="text-gray-500">· {t.area_of_delivery}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {t.philgeps_url && (
                      <a
                        href={t.philgeps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium bg-white text-gray-700 border-gray-200 hover:bg-gray-50 transition-colors"
                        title="Open this tender in PhilGEPS"
                      >
                        Open in PhilGEPS
                      </a>
                    )}
                    <span className="text-gray-300 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/70 space-y-4">
                    {t.description && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Approved budget</div>
                        <div className="text-sm text-gray-700">{t.approved_budget_php != null ? fmtPhp(t.approved_budget_php) : '(not specified)'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Area of delivery</div>
                        <div className="text-sm text-gray-700">{t.area_of_delivery || '(not specified)'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Reference number</div>
                        <div className="text-sm font-mono text-gray-700">{t.reference_number || '(none)'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Posted</div>
                        <div className="text-sm text-gray-700">{fmtDate(t.posted_date) || '(not specified)'}</div>
                      </div>
                      {t.raw_email_received_at && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Received</div>
                          <div className="text-sm text-gray-700">{fmtDate(t.raw_email_received_at)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Closing</div>
                        <div className="text-sm text-gray-700">{fmtDate(t.closing_date) || '(not specified)'}</div>
                      </div>
                    </div>

                    {t.ai_assessment && (() => {
                      const ai = t.ai_assessment as Record<string, any>
                      const hasKnown = ai.reasoning || (Array.isArray(ai.fit_factors) && ai.fit_factors.length > 0) || (Array.isArray(ai.risks) && ai.risks.length > 0) || ai.recommended_action
                      return (
                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">AI assessment</div>
                          {hasKnown ? (
                            <div className="space-y-3 text-sm">
                              {ai.reasoning && (
                                <div>
                                  <div className="text-xs text-gray-500 font-medium mb-0.5">Reasoning</div>
                                  <div className="text-gray-700 whitespace-pre-wrap">{String(ai.reasoning)}</div>
                                </div>
                              )}
                              {Array.isArray(ai.fit_factors) && ai.fit_factors.length > 0 && (
                                <div>
                                  <div className="text-xs text-gray-500 font-medium mb-0.5">Fit factors</div>
                                  <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                                    {ai.fit_factors.map((f: any, i: number) => <li key={i}>{String(f)}</li>)}
                                  </ul>
                                </div>
                              )}
                              {Array.isArray(ai.risks) && ai.risks.length > 0 && (
                                <div>
                                  <div className="text-xs text-gray-500 font-medium mb-0.5">Risks</div>
                                  <ul className="list-disc pl-5 text-gray-700 space-y-0.5">
                                    {ai.risks.map((r: any, i: number) => <li key={i}>{String(r)}</li>)}
                                  </ul>
                                </div>
                              )}
                              {ai.recommended_action && (
                                <div>
                                  <div className="text-xs text-gray-500 font-medium mb-0.5">Recommended action</div>
                                  <div className="text-gray-700 whitespace-pre-wrap">{String(ai.recommended_action)}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <details>
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">View raw assessment data</summary>
                              <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 overflow-x-auto">
{JSON.stringify(ai, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                        <select
                          value={t.status}
                          onChange={e => updateTender(t.id, { status: e.target.value })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          {Object.keys(TENDER_STATUS_LABELS).map(s => (
                            <option key={s} value={s}>{TENDER_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">Assigned to</label>
                        <select
                          value={t.assigned_to || ''}
                          onChange={e => updateTender(t.id, { assigned_to: e.target.value || null })}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Unassigned</option>
                          {REP_OPTIONS.map(r => (
                            <option key={r.email} value={r.email}>{r.label}</option>
                          ))}
                          {t.assigned_to && !REP_OPTIONS.some(r => r.email === t.assigned_to) && (
                            <option value={t.assigned_to}>{t.assigned_to}</option>
                          )}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
                        <textarea
                          defaultValue={t.notes || ''}
                          rows={3}
                          placeholder="Add notes..."
                          onBlur={e => {
                            const v = e.target.value
                            if (v !== (t.notes || '')) updateTender(t.id, { notes: v || null })
                          }}
                          className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      {t.status === 'pursuing' && (
                        <button
                          onClick={() => updateTender(t.id, { status: 'submitted' })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-700 hover:bg-green-800 text-white"
                          title="Mark this tender as submitted to PhilGEPS"
                        >
                          Mark as Submitted
                        </button>
                      )}
                      {t.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => updateTender(t.id, { status: 'won' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-700 hover:bg-green-800 text-white"
                            title="Mark this tender as won"
                          >
                            Mark as Won
                          </button>
                          <button
                            onClick={() => updateTender(t.id, { status: 'lost' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white"
                            title="Mark this tender as lost"
                          >
                            Mark as Lost
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDecline(t.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        title="Decline this tender"
                      >
                        Decline
                      </button>
                      {saving === t.id && <span className="text-xs text-green-600 self-center animate-pulse">Saving...</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">Add Tender</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manually add a PhilGEPS opportunity</p>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTender.title}
                    onChange={e => setNewTender({ ...newTender, title: e.target.value })}
                    placeholder="e.g. Supply of bamboo composite panels"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Agency</label>
                  <input
                    type="text"
                    value={newTender.agency}
                    onChange={e => setNewTender({ ...newTender, agency: e.target.value })}
                    placeholder="e.g. DPWH"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Reference number</label>
                  <input
                    type="text"
                    value={newTender.reference_number}
                    onChange={e => setNewTender({ ...newTender, reference_number: e.target.value })}
                    placeholder="PhilGEPS reference"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Closing date</label>
                  <input
                    type="date"
                    value={newTender.closing_date}
                    onChange={e => setNewTender({ ...newTender, closing_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Approved budget (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                    <input
                      type="number"
                      value={newTender.approved_budget_php}
                      onChange={e => setNewTender({ ...newTender, approved_budget_php: e.target.value })}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Area of delivery</label>
                  <input
                    type="text"
                    value={newTender.area_of_delivery}
                    onChange={e => setNewTender({ ...newTender, area_of_delivery: e.target.value })}
                    placeholder="e.g. NCR, Region IV-A"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">PhilGEPS URL</label>
                  <input
                    type="url"
                    value={newTender.philgeps_url}
                    onChange={e => setNewTender({ ...newTender, philgeps_url: e.target.value })}
                    placeholder="https://notices.philgeps.gov.ph/..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                  <textarea
                    value={newTender.description}
                    rows={3}
                    onChange={e => setNewTender({ ...newTender, description: e.target.value })}
                    placeholder="Tender scope and requirements..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
                  <textarea
                    value={newTender.notes}
                    rows={2}
                    onChange={e => setNewTender({ ...newTender, notes: e.target.value })}
                    placeholder="Any additional context..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
              </div>

              <div className="bg-green-50 rounded-xl px-4 py-3 text-xs text-green-700">
                This tender will be saved with status <strong>new</strong> and added to the active list.
              </div>
            </div>

            <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitNewTender}
                disabled={addSubmitting || !newTender.title.trim()}
                className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {addSubmitting ? 'Adding...' : 'Add Tender'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
