'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, LogOut, Search, ChevronDown, ChevronUp, Save, RefreshCw } from 'lucide-react'

type CrmUser = { id: string; name: string; email: string; role: string; rep_assigned_name: string }

type Lead = {
  id: string
  first_name: string | null
  last_name: string | null
  company: string | null
  email: string | null
  country: string | null
  segment: string | null
  pipeline_stage: string | null
  status: string | null
  rep_assigned: string | null
  priority_tier: string | null
  notes: string | null
  updated_at: string | null
  // editable fields (local state)
  _stage?: string
  _status?: string
  _notes?: string
  _priority?: string
  _dirty?: boolean
}

const STAGES = ['new', 'contacted', 'qualified', 'proposal_sent', 'meeting_booked', 'won', 'lost']
const STATUSES = ['pending', 'active', 'replied', 'nurturing', 'booking_sent', 'booked', 'closed', 'cold_close']
const PRIORITIES = ['High', 'Medium', 'Low', '']

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-yellow-100 text-yellow-700',
  proposal_sent: 'bg-orange-100 text-orange-700',
  meeting_booked: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export default function CrmDashboardPage() {
  const [user, setUser] = useState<CrmUser | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/crm/login'); return }

    const { data: crmUser } = await supabase
      .from('crm_users')
      .select('id, name, email, role, rep_assigned_name')
      .eq('id', authUser.id)
      .single()

    if (!crmUser) { router.push('/crm/login'); return }
    setUser(crmUser)

    let query = supabase
      .from('master_leads')
      .select('id,first_name,last_name,company,email,country,segment,pipeline_stage,status,rep_assigned,priority_tier,notes,updated_at')
      .order('updated_at', { ascending: false })
      .limit(500)

    if (crmUser.role !== 'admin') {
      query = query.ilike('rep_assigned', crmUser.rep_assigned_name)
    }

    const { data: leadsData } = await query
    if (leadsData) {
      setLeads(leadsData.map(l => ({
        ...l,
        _stage: l.pipeline_stage || '',
        _status: l.status || '',
        _notes: l.notes || '',
        _priority: l.priority_tier || '',
        _dirty: false,
      })))
    }
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { loadData() }, [loadData])

  const updateField = (id: string, field: string, value: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value, _dirty: true } : l))
  }

  const saveLead = async (lead: Lead) => {
    setSaving(lead.id)
    const { error } = await supabase
      .from('master_leads')
      .update({
        pipeline_stage: lead._stage,
        status: lead._status,
        notes: lead._notes,
        priority_tier: lead._priority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    if (!error) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, _dirty: false } : l))
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2000)
    }
    setSaving(null)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/crm/login')
  }

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q || [l.first_name, l.last_name, l.company, l.email, l.country]
      .some(v => v?.toLowerCase().includes(q))
    const matchStage = stageFilter === 'all' || l._stage === stageFilter
    return matchSearch && matchStage
  })

  const dirtyCount = leads.filter(l => l._dirty).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-[#1D6A47]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#1D6A47] flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900 text-sm">NUMAT CRM</span>
              <span className="ml-2 text-xs text-gray-400">{user?.name}</span>
              {user?.role === 'admin' && <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">admin</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
            {dirtyCount > 0 && <span className="text-xs text-orange-600">{dirtyCount} unsaved</span>}
            <Button variant="ghost" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search name, company, email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
          >
            <option value="all">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {['total', 'active', 'meeting_booked', 'won'].map(key => {
            const count = key === 'total' ? filtered.length : filtered.filter(l => l._stage === key || l._status === key).length
            const label = key === 'total' ? 'Total' : key.replace('_', ' ')
            return (
              <div key={key} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 capitalize">{label}</div>
              </div>
            )
          })}
        </div>

        {/* Lead list */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No leads found</div>
          )}
          {filtered.map(lead => (
            <div key={lead.id} className={`bg-white rounded-lg border ${lead._dirty ? 'border-orange-300' : 'border-gray-200'} overflow-hidden`}>
              {/* Row summary */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400 truncate">{lead.company}</span>
                    {lead._stage && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STAGE_COLORS[lead._stage] || 'bg-gray-100 text-gray-600'}`}>
                        {lead._stage.replace('_', ' ')}
                      </span>
                    )}
                    {lead._dirty && <span className="text-xs text-orange-500">unsaved</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{lead.email} {lead.country ? `· ${lead.country}` : ''}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {lead._dirty && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-[#1D6A47] hover:bg-[#155a3a] text-white"
                      onClick={e => { e.stopPropagation(); saveLead(lead) }}
                      disabled={saving === lead.id}
                    >
                      {saving === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" />Save</>}
                    </Button>
                  )}
                  {expandedId === lead.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded edit panel */}
              {expandedId === lead.id && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Stage</label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={lead._stage || ''}
                        onChange={e => updateField(lead.id, '_stage', e.target.value)}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={lead._status || ''}
                        onChange={e => updateField(lead.id, '_status', e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={lead._priority || ''}
                        onChange={e => updateField(lead.id, '_priority', e.target.value)}
                      >
                        {PRIORITIES.map(p => <option key={p} value={p}>{p || 'None'}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
                      <textarea
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white resize-none"
                        rows={3}
                        value={lead._notes || ''}
                        onChange={e => updateField(lead.id, '_notes', e.target.value)}
                        placeholder="Add notes..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-400">
                      Segment: {lead.segment || 'N/A'} · Rep: {lead.rep_assigned || 'N/A'}
                      {lead.updated_at ? ` · Updated: ${new Date(lead.updated_at).toLocaleDateString('en-PH')}` : ''}
                    </span>
                    <Button
                      size="sm"
                      className="bg-[#1D6A47] hover:bg-[#155a3a] text-white"
                      onClick={() => saveLead(lead)}
                      disabled={saving === lead.id || !lead._dirty}
                    >
                      {saving === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" />Save Changes</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
