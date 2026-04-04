'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || ''

const CATEGORIES = ['product', 'pricing', 'process', 'faq', 'company']

type KnowledgeEntry = {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

type UnansweredQuestion = {
  id: string
  session_id: string
  question: string
  created_at: string
  resolved: boolean
}

type ChatSession = {
  id: string
  started_at: string
  completed: boolean
  lead_submitted: boolean
  page_url: string | null
}

type ChatMessage = {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'x-admin-secret': ADMIN_SECRET,
})

// ─── Knowledge Tab ────────────────────────────────────────────────────────────

function KnowledgeTab() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: 'faq', question: '', answer: '', keywords: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/nara-knowledge', { headers: authHeaders() })
    if (res.ok) setEntries(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ category: 'faq', question: '', answer: '', keywords: '' })
    setEditId(null)
    setShowForm(false)
  }

  const prefillForm = (entry: KnowledgeEntry) => {
    setForm({
      category: entry.category,
      question: entry.question,
      answer: entry.answer,
      keywords: entry.keywords.join(', '),
    })
    setEditId(entry.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast({ title: 'Required', description: 'Question and answer are required.', variant: 'destructive' })
      return
    }
    setSaving(true)
    const keywords = form.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    const payload = { category: form.category, question: form.question.trim(), answer: form.answer.trim(), keywords }

    const res = editId
      ? await fetch('/api/nara-knowledge', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ id: editId, ...payload }) })
      : await fetch('/api/nara-knowledge', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })

    if (res.ok) {
      toast({ title: editId ? 'Entry updated' : 'Entry added', description: form.question.slice(0, 60) })
      resetForm()
      load()
    } else {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' })
    }
    setSaving(false)
  }

  const toggleActive = async (entry: KnowledgeEntry) => {
    const res = await fetch('/api/nara-knowledge', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ id: entry.id, is_active: !entry.is_active }),
    })
    if (res.ok) {
      toast({ title: entry.is_active ? 'Deactivated' : 'Activated' })
      load()
    }
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit form */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-foreground hover:bg-muted/40 transition-colors"
          onClick={() => { setShowForm(s => !s); if (editId) resetForm() }}
        >
          <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> {editId ? 'Edit Entry' : 'Add New Entry'}</span>
          {showForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showForm && (
          <div className="p-4 border-t border-border space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1.5"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Keywords <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                <Input
                  className="mt-1.5"
                  placeholder="price, quote, cost"
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Question</Label>
              <Input
                className="mt-1.5"
                placeholder="How do I get a quote?"
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              />
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea
                className="mt-1.5 resize-none"
                rows={4}
                placeholder="The full answer NARA should give..."
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : editId ? 'Update Entry' : 'Add Entry'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Entries table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Knowledge Entries <span className="text-muted-foreground font-normal text-sm">({entries.length})</span></h2>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">No entries yet. Add one above.</p>
        ) : (
          <div className="divide-y divide-border">
            {entries.map(entry => (
              <div key={entry.id} className={cn('p-4 flex gap-4 items-start', !entry.is_active && 'opacity-50 bg-muted/30')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{entry.category}</span>
                    {!entry.is_active && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">inactive</span>}
                  </div>
                  <p className="font-medium text-sm text-foreground">{entry.question}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.answer}</p>
                  {entry.keywords?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Keywords:</span> {entry.keywords.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => prefillForm(entry)}>Edit</Button>
                  <Button
                    variant="outline" size="sm"
                    className={entry.is_active ? 'text-destructive border-destructive/30 hover:bg-destructive/10' : 'text-primary border-primary/30 hover:bg-primary/10'}
                    onClick={() => toggleActive(entry)}
                  >
                    {entry.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Unanswered Tab ──────────────────────────────────────────────────────────

function UnansweredTab() {
  const { toast } = useToast()
  const [items, setItems] = useState<UnansweredQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: 'faq', question: '', answer: '', keywords: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const res = await fetch(`${supabaseUrl}/rest/v1/nara_unanswered?resolved=eq.false&order=created_at.desc`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markResolved = async (id: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    await fetch(`${supabaseUrl}/rest/v1/nara_unanswered?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ resolved: true }),
    })
    toast({ title: 'Marked resolved' })
    setItems(prev => prev.filter(i => i.id !== id))
    setAddingId(null)
  }

  const handleAddToKnowledge = async (item: UnansweredQuestion) => {
    if (!form.answer.trim()) {
      toast({ title: 'Answer required', variant: 'destructive' })
      return
    }
    setSaving(true)
    const keywords = form.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    const res = await fetch('/api/nara-knowledge', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ category: form.category, question: form.question || item.question, answer: form.answer, keywords }),
    })
    if (res.ok) {
      toast({ title: 'Added to knowledge base' })
      await markResolved(item.id)
      setForm({ category: 'faq', question: '', answer: '', keywords: '' })
    } else {
      toast({ title: 'Error', variant: 'destructive' })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Unanswered Questions <span className="text-muted-foreground font-normal text-sm">({items.length} unresolved)</span></h2>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">No unresolved questions. Great job!</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">"{item.question}"</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Session {item.session_id.slice(0, 8)}… · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => {
                        setAddingId(addingId === item.id ? null : item.id)
                        setForm(f => ({ ...f, question: item.question }))
                      }}
                    >
                      {addingId === item.id ? 'Cancel' : 'Add to KB'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => markResolved(item.id)}>Resolve</Button>
                  </div>
                </div>
                {addingId === item.id && (
                  <div className="bg-muted/40 rounded-lg p-4 space-y-3 border border-border">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Category</Label>
                        <select
                          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm mt-1"
                          value={form.category}
                          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Keywords</Label>
                        <Input className="mt-1 h-9 text-sm" placeholder="keyword1, keyword2" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Question (editable)</Label>
                      <Input className="mt-1 text-sm" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Answer <span className="text-destructive">*</span></Label>
                      <Textarea className="mt-1 resize-none text-sm" rows={3} placeholder="Write the answer…" value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} />
                    </div>
                    <Button size="sm" onClick={() => handleAddToKnowledge(item)} disabled={saving} className="bg-primary text-primary-foreground">
                      {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : 'Save to Knowledge Base'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Conversations Tab ────────────────────────────────────────────────────────

function ConversationsTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [loadingMessages, setLoadingMessages] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const res = await fetch(`${supabaseUrl}/rest/v1/chat_sessions?order=started_at.desc&limit=50`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (res.ok) setSessions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const expandSession = async (sessionId: string) => {
    if (expanded === sessionId) { setExpanded(null); return }
    setExpanded(sessionId)
    if (messages[sessionId]) return
    setLoadingMessages(sessionId)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const res = await fetch(`${supabaseUrl}/rest/v1/chat_messages?session_id=eq.${sessionId}&order=created_at.asc`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (res.ok) {
      const data = await res.json()
      setMessages(prev => ({ ...prev, [sessionId]: data }))
    }
    setLoadingMessages(null)
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Conversations <span className="text-muted-foreground font-normal text-sm">({sessions.length})</span></h2>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : sessions.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">No conversations yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map(session => (
              <div key={session.id}>
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => expandSession(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">{session.id.slice(0, 12)}…</span>
                      {session.lead_submitted && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Lead submitted</span>
                      )}
                      {session.completed && !session.lead_submitted && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Completed</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(session.started_at).toLocaleString()}
                      {session.page_url && <> · <span className="truncate">{session.page_url.replace(/^https?:\/\/[^/]+/, '')}</span></>}
                    </p>
                  </div>
                  {expanded === session.id
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                </button>
                {expanded === session.id && (
                  <div className="px-4 pb-4 bg-muted/20 border-t border-border">
                    {loadingMessages === session.id ? (
                      <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                    ) : (
                      <div className="space-y-2 pt-3 max-h-80 overflow-y-auto">
                        {(messages[session.id] || []).map(msg => (
                          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              'max-w-[80%] px-3 py-2 rounded-lg text-xs leading-relaxed',
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-white border border-border text-foreground rounded-bl-sm'
                            )}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {(messages[session.id] || []).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No messages stored.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'knowledge' | 'unanswered' | 'conversations'

export default function NaraAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('knowledge')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'knowledge', label: 'Knowledge Base' },
    { id: 'unanswered', label: 'Unanswered Questions' },
    { id: 'conversations', label: 'Recent Conversations' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground">NARA Knowledge Manager</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage the knowledge base, review unanswered questions, and browse chat conversations.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'knowledge' && <KnowledgeTab />}
      {activeTab === 'unanswered' && <UnansweredTab />}
      {activeTab === 'conversations' && <ConversationsTab />}
    </div>
  )
}
