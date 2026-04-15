'use client'

import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  Search, Filter, X, ChevronLeft, ChevronRight,
  SquareCheck, Square, Save, Loader2, RefreshCw,
  Mail, MapPin, TrendingUp, MessageSquare, Building2, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useAdminRole } from '@/app/admin/layout'

// ─── Types ──────────────────────────────────────────────────────────────────
type Lead = {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  company: string | null
  country: string | null
  segment: string | null
  status: string
  pipeline_stage: string | null
  rep_assigned: string | null
  notes: string | null
  last_activity_at: string | null
  last_activity_type: string | null
  email_1_sent: string | null
  email_2_sent: string | null
  email_3_sent: string | null
  email_4_sent: string | null
  email_5_sent: string | null
  replied_at: string | null
  appointment_date: string | null
  booking_confirmed: boolean | null
  report_sent: string | null
  created_at: string
  updated_at: string | null
}

type LeadsResponse = {
  leads: Lead[]
  total: number
  page: number
  limit: number
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  'Lead', 'Contacted', 'Interested', 'Proposal Sent',
  'Meeting Booked', 'Negotiating', 'Won', 'Lost', 'Not Interested',
]

const ACTIVITY_TYPES = [
  'Email', 'Phone Call', 'WhatsApp', 'Meeting', 'LinkedIn', 'Follow Up', 'Other',
]

const SEGMENTS = [
  'Hotel / Resort', 'Architects', 'Construction', 'Interior Designers',
  'Furniture Makers', 'Wood Distributors', 'Property Developer', 'B2C',
]

const STATUSES = ['active', 'pending', 'suppressed', 'replied']

const STAGE_COLORS: Record<string, string> = {
  'Lead': 'bg-slate-100 text-slate-700',
  'Contacted': 'bg-blue-100 text-blue-700',
  'Interested': 'bg-cyan-100 text-cyan-700',
  'Proposal Sent': 'bg-violet-100 text-violet-700',
  'Meeting Booked': 'bg-amber-100 text-amber-700',
  'Negotiating': 'bg-orange-100 text-orange-700',
  'Won': 'bg-green-100 text-green-700',
  'Lost': 'bg-red-100 text-red-700',
  'Not Interested': 'bg-gray-100 text-gray-500',
}

const STATUS_COLORS: Record<string, string> = {
  'active': 'bg-emerald-100 text-emerald-700',
  'pending': 'bg-yellow-100 text-yellow-700',
  'suppressed': 'bg-gray-100 text-gray-500',
  'replied': 'bg-blue-100 text-blue-700',
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Helpers ─────────────────────────────────────────────────────────────────
function emailCount(lead: Lead) {
  return [
    lead.email_1_sent, lead.email_2_sent, lead.email_3_sent,
    lead.email_4_sent, lead.email_5_sent,
  ].filter(Boolean).length
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ─── Lead Update Drawer ───────────────────────────────────────────────────────
function LeadDrawer({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [stage, setStage] = useState(lead.pipeline_stage ?? '')
  const [status, setStatus] = useState(lead.status ?? '')
  const [activityType, setActivityType] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!stage && !note && !activityType && status === lead.status) {
      toast({ title: 'Nothing to save', description: 'Make at least one change.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          pipeline_stage: stage || undefined,
          status: status !== lead.status ? status : undefined,
          note: note.trim() || undefined,
          last_activity_type: activityType || undefined,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast({ title: 'Updated', description: `${lead.full_name ?? lead.email} has been updated.` })
      onSaved()
      onClose()
    } catch {
      toast({ title: 'Error', description: 'Could not save changes.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const displayName = lead.full_name || `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || lead.email || 'Unknown'

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-start justify-between z-10">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Update Lead</p>
            <h2 className="font-semibold text-foreground text-lg leading-tight">{displayName}</h2>
            {lead.company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                {lead.company}
              </p>
            )}
          </div>
          <button onClick={onClose} className="mt-1 p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-xl p-4 border border-border/50">
            {lead.email && (
              <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.segment && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{lead.segment}</span>
              </div>
            )}
            {lead.country && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{lead.country}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span>{emailCount(lead)} email{emailCount(lead) !== 1 ? 's' : ''} sent</span>
            </div>
            {lead.replied_at && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Replied {timeAgo(lead.replied_at)}</span>
              </div>
            )}
            {lead.report_sent && (
              <div className="flex items-center gap-1.5 text-violet-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Report sent</span>
              </div>
            )}
          </div>

          {/* Pipeline Stage */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Pipeline Stage</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PIPELINE_STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left',
                    stage === s
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Activity Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Activity Type</label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_TYPES.map(a => (
                <button
                  key={a}
                  onClick={() => setActivityType(activityType === a ? '' : a)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                    activityType === a
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Add Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What happened on this lead? Notes are appended with a timestamp."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
          </div>

          {/* Existing notes (read-only) */}
          {lead.notes && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Previous Notes</label>
              <div className="bg-muted/30 rounded-lg border border-border/50 p-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                {lead.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <Button onClick={handleSave} disabled={saving} className="w-full h-11">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminLeadsPage() {
  const { role, name } = useAdminRole()
  const { toast } = useToast()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [status, setStatus] = useState('')
  const [stage, setStage] = useState('')
  const [repFilter, setRepFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStage, setBulkStage] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const buildUrl = () => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    if (debouncedSearch) p.set('search', debouncedSearch)
    if (segment) p.set('segment', segment)
    if (status) p.set('status', status)
    if (stage) p.set('stage', stage)
    if (repFilter && role === 'admin') p.set('rep', repFilter)
    return `/api/admin/leads?${p.toString()}`
  }

  const { data, isLoading, mutate } = useSWR<LeadsResponse>(buildUrl(), fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  const leads = data?.leads ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  const clearFilters = () => {
    setSearch('')
    setSegment('')
    setStatus('')
    setStage('')
    setRepFilter('')
    setPage(1)
  }

  const hasFilters = !!(search || segment || status || stage || repFilter)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkStage || selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk_ids: Array.from(selectedIds),
          bulk_update: { pipeline_stage: bulkStage },
        }),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      toast({ title: `Updated ${result.updated} leads`, description: `Stage set to "${bulkStage}"` })
      setSelectedIds(new Set())
      setBulkStage('')
      mutate()
    } catch {
      toast({ title: 'Error', description: 'Bulk update failed', variant: 'destructive' })
    } finally {
      setBulkUpdating(false)
    }
  }

  const isRepView = role === 'rep'
  const pageTitle = isRepView ? `My Leads` : 'All Leads'
  const pageSubtitle = isRepView
    ? `${total.toLocaleString()} leads assigned to you`
    : `${total.toLocaleString()} total leads`

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">{pageTitle}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{pageSubtitle}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Search + Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, company, email..."
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(v => !v)}
            className="h-10 gap-2 shrink-0"
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && (
              <span className="w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-semibold">
                !
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={segment}
                onChange={e => { setSegment(e.target.value); setPage(1) }}
                className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">All Segments</option>
                {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1) }}
                className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>

              <select
                value={stage}
                onChange={e => { setStage(e.target.value); setPage(1) }}
                className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">All Stages</option>
                {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {role === 'admin' && (
                <select
                  value={repFilter}
                  onChange={e => { setRepFilter(e.target.value); setPage(1) }}
                  className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="">All Reps</option>
                  <option value="Mohan">Mohan</option>
                  <option value="Bryan">Bryan</option>
                  <option value="Lemuel">Lemuel</option>
                </select>
              )}
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions (admin only) */}
      {role === 'admin' && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} selected
          </span>
          <select
            value={bulkStage}
            onChange={e => setBulkStage(e.target.value)}
            className="h-8 px-3 rounded-lg border border-input bg-background text-xs"
          >
            <option value="">Set stage...</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button
            size="sm"
            onClick={handleBulkUpdate}
            disabled={!bulkStage || bulkUpdating}
            className="h-8 text-xs"
          >
            {bulkUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {/* Lead Table — Desktop */}
      <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              {role === 'admin' && (
                <th className="w-10 px-4 py-3 text-left">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.size === leads.length && leads.length > 0
                      ? <SquareCheck className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Segment</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stage</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              {role === 'admin' && (
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rep</th>
              )}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Activity</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Emails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={role === 'admin' ? 8 : 6} className="px-4 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={role === 'admin' ? 8 : 6} className="px-4 py-12 text-center text-muted-foreground">
                  No leads found
                </td>
              </tr>
            ) : leads.map(lead => (
              <tr
                key={lead.id}
                className={cn(
                  'hover:bg-muted/30 transition-colors cursor-pointer',
                  selectedIds.has(lead.id) && 'bg-primary/5'
                )}
                onClick={() => setActiveLead(lead)}
              >
                {role === 'admin' && (
                  <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(lead.id) }}>
                    {selectedIds.has(lead.id)
                      ? <SquareCheck className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-muted-foreground" />
                    }
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground leading-tight">
                    {lead.full_name || `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lead.company || lead.email || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{lead.segment || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  {lead.pipeline_stage ? (
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STAGE_COLORS[lead.pipeline_stage] ?? 'bg-muted text-muted-foreground')}>
                      {lead.pipeline_stage}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[lead.status] ?? 'bg-muted text-muted-foreground')}>
                    {lead.status}
                  </span>
                </td>
                {role === 'admin' && (
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{lead.rep_assigned || '—'}</span>
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {lead.last_activity_at ? timeAgo(lead.last_activity_at) : timeAgo(lead.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => {
                      const sent = !!(lead as any)[`email_${n}_sent`]
                      return (
                        <div
                          key={n}
                          className={cn(
                            'w-2 h-2 rounded-full',
                            sent ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lead Cards — Mobile */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
            No leads found
          </div>
        ) : leads.map(lead => (
          <div
            key={lead.id}
            onClick={() => setActiveLead(lead)}
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground leading-tight truncate">
                  {lead.full_name || `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {lead.company || lead.email || '—'}
                </p>
              </div>
              {lead.pipeline_stage && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', STAGE_COLORS[lead.pipeline_stage] ?? 'bg-muted text-muted-foreground')}>
                  {lead.pipeline_stage}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {lead.segment && <span>{lead.segment}</span>}
              {lead.country && (
                <>
                  <span>·</span>
                  <span>{lead.country}</span>
                </>
              )}
              {role === 'admin' && lead.rep_assigned && (
                <>
                  <span>·</span>
                  <span className="text-primary font-medium">{lead.rep_assigned}</span>
                </>
              )}
              <span>·</span>
              <span>{emailCount(lead)} emails</span>
              {lead.last_activity_at && (
                <>
                  <span>·</span>
                  <span>{timeAgo(lead.last_activity_at)}</span>
                </>
              )}
            </div>
            {lead.replied_at && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                Replied
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total.toLocaleString()} leads
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Update Drawer */}
      {activeLead && (
        <LeadDrawer
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onSaved={() => mutate()}
        />
      )}
    </div>
  )
}