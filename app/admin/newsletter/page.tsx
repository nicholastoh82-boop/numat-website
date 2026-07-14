'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

type Sub = { email: string; first_name: string | null; categories: string[]; status: string }
type Mode = 'all' | 'categories' | 'emails'

export default function NewsletterPage() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [from, setFrom] = useState('contact@numat.ph')
  const [cats, setCats] = useState<string[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState<'' | 'test' | 'send'>('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [mode, setMode] = useState<Mode>('all')
  const [selCats, setSelCats] = useState<string[]>([])
  const [subs, setSubs] = useState<Sub[]>([])
  const [selEmails, setSelEmails] = useState<string[]>([])
  const [pickSearch, setPickSearch] = useState('')
  const [recipientCount, setRecipientCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/newsletter').then((r) => r.json()).then((d) => {
      if (d.from) setFrom(d.from)
      if (typeof d.audienceCount === 'number') { setTotal(d.audienceCount); setRecipientCount(d.audienceCount) }
      if (d.categories) setCats(d.categories)
      if (d.counts) setCounts(d.counts)
    }).catch(() => {})
    fetch('/api/admin/newsletter/subscribers').then((r) => r.json()).then((d) => {
      if (d.subscribers) setSubs(d.subscribers.filter((s: Sub) => s.status === 'subscribed'))
    }).catch(() => {})
  }, [])

  // Live recipient count for the current selection.
  useEffect(() => {
    let cancel = false
    const run = async () => {
      if (mode === 'emails') { setRecipientCount(selEmails.length); return }
      const res = await fetch('/api/admin/newsletter', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendTo: { mode, categories: selCats } }),
      })
      const d = await res.json()
      if (!cancel && typeof d.count === 'number') setRecipientCount(d.count)
    }
    run()
    return () => { cancel = true }
  }, [mode, selCats, selEmails])

  const cmd = (c: string, v?: string) => { bodyRef.current?.focus(); document.execCommand(c, false, v) }
  const addLink = () => { const u = window.prompt('Link URL (include https://)'); if (u) cmd('createLink', u) }
  const getBody = () => (bodyRef.current?.innerHTML || '').trim()

  const pickList = useMemo(() => {
    const t = pickSearch.trim().toLowerCase()
    return subs.filter((s) => !t || s.email.toLowerCase().includes(t) || (s.first_name || '').toLowerCase().includes(t))
  }, [subs, pickSearch])

  const post = async (action: 'test' | 'send') => {
    setStatus(null)
    const bodyHtml = getBody()
    if (!subject.trim()) return setStatus({ kind: 'err', text: 'Add a subject first.' })
    if (!bodyHtml || bodyHtml === '<br>') return setStatus({ kind: 'err', text: 'Write the newsletter body first.' })
    const payload: any = { action, subject, previewText, bodyHtml }
    if (action === 'test') payload.testEmail = testEmail
    if (action === 'send') payload.sendTo = { mode, categories: selCats, emails: selEmails }
    setBusy(action)
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Something went wrong.')
      setStatus({ kind: 'ok', text: d.message || 'Done.' })
    } catch (e: any) {
      setStatus({ kind: 'err', text: e.message })
    } finally { setBusy('') }
  }

  const sendToList = () => {
    const n = recipientCount
    if (n === 0) return setStatus({ kind: 'err', text: 'No subscribers match that selection.' })
    const who = n === null ? 'the selected subscribers' : `${n} subscriber${n === 1 ? '' : 's'}`
    if (window.confirm(`Send this newsletter to ${who}? This cannot be undone.`)) post('send')
  }

  const btn = 'px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
  const toggleCat = (c: string) => setSelCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
  const toggleEmail = (e: string) => setSelEmails((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]))

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Newsletter</h1>
        <Link href="/admin/newsletter/subscribers" className="text-sm text-green-700 hover:underline">Manage subscribers</Link>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Sends from <span className="font-medium">{from}</span>. Unsubscribe is added automatically. {total} total subscriber{total === 1 ? '' : 's'}.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. NUMAT Update: New engineered bamboo panels"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preview text <span className="text-gray-400">(optional)</span></label>
          <input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="One line summary"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
          <div className="flex flex-wrap gap-1 mb-2">
            <button type="button" className={btn} onClick={() => cmd('bold')}><b>B</b></button>
            <button type="button" className={btn} onClick={() => cmd('italic')}><i>I</i></button>
            <button type="button" className={btn} onClick={() => cmd('formatBlock', 'h2')}>Heading</button>
            <button type="button" className={btn} onClick={() => cmd('insertUnorderedList')}>List</button>
            <button type="button" className={btn} onClick={addLink}>Link</button>
          </div>
          <div ref={bodyRef} contentEditable suppressContentEditableWarning
            className="min-h-[240px] w-full rounded border border-gray-300 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-700 prose max-w-none" />
        </div>

        {/* Send to */}
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-800 mb-2">Send to</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} /> Everyone</label>
            <label className="flex items-center gap-2"><input type="radio" checked={mode === 'categories'} onChange={() => setMode('categories')} /> Specific categories</label>
            <label className="flex items-center gap-2"><input type="radio" checked={mode === 'emails'} onChange={() => setMode('emails')} /> Pick contacts</label>
          </div>

          {mode === 'categories' && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <button key={c} type="button" onClick={() => toggleCat(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${selCats.includes(c) ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {c} ({counts[c] || 0})
                </button>
              ))}
            </div>
          )}

          {mode === 'emails' && (
            <div className="mt-3">
              <input value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} placeholder="Search subscribers"
                className="mb-2 w-full max-w-xs rounded border border-gray-300 px-3 py-1.5 text-sm" />
              <div className="max-h-52 overflow-y-auto rounded border border-gray-200 divide-y divide-gray-100">
                {pickList.map((s) => (
                  <label key={s.email} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                    <input type="checkbox" checked={selEmails.includes(s.email)} onChange={() => toggleEmail(s.email)} />
                    <span className="text-gray-700">{s.first_name ? `${s.first_name} · ` : ''}{s.email}</span>
                  </label>
                ))}
                {pickList.length === 0 && <p className="px-3 py-3 text-sm text-gray-400">No matches.</p>}
              </div>
            </div>
          )}

          <p className="mt-3 text-sm text-gray-600">
            This will send to <span className="font-semibold text-gray-900">{recipientCount ?? '…'}</span> subscriber{recipientCount === 1 ? '' : 's'}
            <span className="text-gray-400"> (unsubscribed and bounced addresses are skipped).</span>
          </p>
        </div>

        {status && (
          <div className={`rounded px-3 py-2 text-sm ${status.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{status.text}</div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2 border-t border-gray-100">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Send a test to</label>
            <div className="flex gap-2">
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@numat.ph"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
              <button type="button" disabled={busy !== ''} onClick={() => post('test')}
                className="px-4 py-2 text-sm rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50">
                {busy === 'test' ? 'Sending...' : 'Send test'}
              </button>
            </div>
          </div>
          <button type="button" disabled={busy !== ''} onClick={sendToList}
            className="px-5 py-2 text-sm rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">
            {busy === 'send' ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
