'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  phone: string | null
  city: string | null
  deal_value_php: number | null
  deal_value_usd: number | null
  qty: number | null
  unit: string | null
  close_date: string | null
  won_lost: string | null
  meeting_link: string | null
  follow_up: string | null
  appointment_date: string | null
  updated_at: string | null
  // local editable state
  _stage: string
  _status: string
  _priority: string
  _notes: string
  _phone: string
  _city: string
  _value_php: string
  _value_usd: string
  _qty: string
  _unit: string
  _close_date: string
  _won_lost: string
  _meeting_link: string
  _follow_up: string
  _dirty: boolean
}

const STAGES = ['new','contacted','qualified','proposal_sent','meeting_booked','won','lost']
const STATUSES = ['pending','active','replied','nurturing','booking_sent','booked','closed','cold_close','bounced','unsubscribed']
const PRIORITIES = ['High','Medium','Low','']
const WON_LOST_OPTIONS = ['','Won','Lost','No Decision','Deferred']
const UNITS = ['','pcs','sqm','lm','sheets','sets']

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-yellow-100 text-yellow-700',
  proposal_sent: 'bg-orange-100 text-orange-700',
  meeting_booked: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

function initLead(l: Omit<Lead, '_stage'|'_status'|'_priority'|'_notes'|'_phone'|'_city'|'_value_php'|'_value_usd'|'_qty'|'_unit'|'_close_date'|'_won_lost'|'_meeting_link'|'_follow_up'|'_dirty'>): Lead {
  return {
    ...l,
    _stage: l.pipeline_stage || '',
    _status: l.status || '',
    _priority: l.priority_tier || '',
    _notes: l.notes || '',
    _phone: l.phone || '',
    _city: l.city || '',
    _value_php: l.deal_value_php != null ? String(l.deal_value_php) : '',
    _value_usd: l.deal_value_usd != null ? String(l.deal_value_usd) : '',
    _qty: l.qty != null ? String(l.qty) : '',
    _unit: l.unit || '',
    _close_date: l.close_date || '',
    _won_lost: l.won_lost || '',
    _meeting_link: l.meeting_link || '',
    _follow_up: l.follow_up || '',
    _dirty: false,
  }
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
      .select('id,name,email,role,rep_assigned_name')
      .eq('id', authUser.id)
      .single()
    if (!crmUser) { router.push('/crm/login'); return }
    setUser(crmUser)

    let query = supabase
      .from('master_leads')
      .select('id,first_name,last_name,company,email,country,segment,pipeline_stage,status,rep_assigned,priority_tier,notes,phone,city,deal_value_php,deal_value_usd,qty,unit,close_date,won_lost,meeting_link,follow_up,appointment_date,updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (crmUser.role !== 'admin') {
      query = query.ilike('rep_assigned', crmUser.rep_assigned_name)
    }

    const { data: leadsData } = await query
    if (leadsData) setLeads(leadsData.map(initLead))
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
        pipeline_stage: lead._stage || null,
        status: lead._status || null,
        priority_tier: lead._priority || null,
        notes: lead._notes || null,
        phone: lead._phone || null,
        city: lead._city || null,
        deal_value_php: lead._value_php ? parseFloat(lead._value_php) : null,
        deal_value_usd: lead._value_usd ? parseFloat(lead._value_usd) : null,
        qty: lead._qty ? parseFloat(lead._qty) : null,
        unit: lead._unit || null,
        close_date: lead._close_date || null,
        won_lost: lead._won_lost || null,
        meeting_link: lead._meeting_link || null,
        follow_up: lead._follow_up || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    if (!error) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, _dirty: false } : l))
      setSaveMsg('Saved ✓')
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
    const matchSearch = !q || [l.first_name, l.last_name, l.company, l.email, l.country, l.city]
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
              {user?.role === 'admin' && (
                <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">admin</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
            {dirtyCount > 0 && <span className="text-xs text-orange-500">{dirtyCount} unsaved</span>}
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
            <Input
              placeholder="Search name, company, email, city..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
          >
            <option value="all">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total', count: filtered.length },
            { label: 'Active', count: filtered.filter(l => l._status === 'active').length },
            { label: 'Meeting Booked', count: filtered.filter(l => l._stage === 'meeting_booked').length },
            { label: 'Won', count: filtered.filter(l => l._stage === 'won').length },
          ].map(({ label, count }) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Lead list */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No leads found</div>
          )}
          {filtered.map(lead => (
            <div
              key={lead.id}
              className={`bg-white rounded-lg border ${lead._dirty ? 'border-orange-300' : 'border-gray-200'} overflow-hidden`}
            >
              {/* Summary row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">
                      {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400 truncate">{lead.company}</span>
                    {lead._stage && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STAGE_COLORS[lead._stage] || 'bg-gray-100 text-gray-600'}`}>
                        {lead._stage.replace(/_/g, ' ')}
                      </span>
                    )}
                    {lead._won_lost && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{lead._won_lost}</span>
                    )}
                    {lead._dirty && <span className="text-xs text-orange-500">unsaved</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {lead.email}
                    {lead.country ? ` · ${lead.country}` : ''}
                    {lead._city ? ` · ${lead._city}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {lead._dirty && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-[#1D6A47] hover:bg-[#155a3a] text-white"
                      onClick={e => { e.stopPropagation(); saveLead(lead) }}
                      disabled={saving === lead.id}
                    >
                      {saving === lead.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><Save className="h-3 w-3 mr-1" />Save</>
                      }
                    </Button>
                  )}
                  {expandedId === lead.id
                    ? <ChevronUp className="h-4 w-4 text-gray-400" />
                    : <ChevronDown className="h-4 w-4 text-gray-400" />
                  }
                </div>
              </div>

              {/* Edit panel */}
              {expandedId === lead.id && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Stage */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Stage</label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={lead._stage}
                        onChange={e => updateField(lead.id, '_stage', e.target.value)}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={lead._status}
                        onChange={e => updateField(lead.id, '_status', e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={lead._priority}
                        onChange={e => updateField(lead.id, '_priority', e.target.value)}
                      >
                        {PRIORITIES.map(p => <option key={p} value={p}>{p || 'None'}</option>)}
                      </select>
                    </div>

                    {/* Won/Lost */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Won / Lost</label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={lead._won_lost}
                        onChange={e => updateField(lead.id, '_won_lost', e.target.value)}
                      >
                        {WON_LOST_OPTIONS.map(o => <option key={o} value={o}>{o || 'Not set'}</option>)}
                      </select>
                    </div>

                    {/* Value PHP */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Value (PHP)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={lead._value_php}
                        onChange={e => updateField(lead.id, '_value_php', e.target.value)}
                      />
                    </div>

                    {/* Value USD */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Value (USD)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={lead._value_usd}
                        onChange={e => updateField(lead.id, '_value_usd', e.target.value)}
                      />
                    </div>

                    {/* Qty */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Qty</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={lead._qty}
                        onChange={e => updateField(lead.id, '_qty', e.target.value)}
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Unit</label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={lead._unit}
                        onChange={e => updateField(lead.id, '_unit', e.target.value)}
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u || 'Select'}</option>)}
                      </select>
                    </div>

                    {/* Close Date */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Close Date</label>
                      <Input
                        type="date"
                        value={lead._close_date}
                        onChange={e => updateField(lead.id, '_close_date', e.target.value)}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
                      <Input
                        placeholder="+63..."
                        value={lead._phone}
                        onChange={e => updateField(lead.id, '_phone', e.target.value)}
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">City</label>
                      <Input
                        placeholder="City"
                        value={lead._city}
                        onChange={e => updateField(lead.id, '_city', e.target.value)}
                      />
                    </div>

                    {/* Meeting Link */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Meeting Link</label>
                      <Input
                        placeholder="https://cal.com/..."
                        value={lead._meeting_link}
                        onChange={e => updateField(lead.id, '_meeting_link', e.target.value)}
                      />
                    </div>

                    {/* Follow-Up */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Follow-Up</label>
                      <Input
                        placeholder="e.g. Call back 20 Apr"
                        value={lead._follow_up}
                        onChange={e => updateField(lead.id, '_follow_up', e.target.value)}
                      />
                    </div>

                    {/* Notes — full width */}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
                      <textarea
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white resize-none"
                        rows={3}
                        placeholder="Add notes..."
                        value={lead._notes}
                        onChange={e => updateField(lead.id, '_notes', e.target.value)}
                      />
                    </div>

                  </div>

                  {/* Footer row */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
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
                      {saving === lead.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Save className="h-4 w-4 mr-1" />Save Changes</>
                      }
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
