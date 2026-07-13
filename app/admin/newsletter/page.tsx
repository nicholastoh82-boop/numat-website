'use client'

import { useEffect, useRef, useState } from 'react'

export default function NewsletterPage() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [from, setFrom] = useState('contact@numat.ph')
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [busy, setBusy] = useState<'' | 'test' | 'send'>('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/newsletter')
      .then((r) => r.json())
      .then((d) => {
        if (d.from) setFrom(d.from)
        if (typeof d.audienceCount === 'number') setAudienceCount(d.audienceCount)
      })
      .catch(() => {})
  }, [])

  const cmd = (command: string, value?: string) => {
    bodyRef.current?.focus()
    document.execCommand(command, false, value)
  }

  const addLink = () => {
    const url = window.prompt('Link URL (include https://)')
    if (url) cmd('createLink', url)
  }

  const getBody = () => (bodyRef.current?.innerHTML || '').trim()

  const post = async (action: 'test' | 'send', extra: Record<string, unknown> = {}) => {
    setStatus(null)
    const bodyHtml = getBody()
    if (!subject.trim()) return setStatus({ kind: 'err', text: 'Add a subject first.' })
    if (!bodyHtml || bodyHtml === '<br>') return setStatus({ kind: 'err', text: 'Write the newsletter body first.' })
    setBusy(action)
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, subject, previewText, bodyHtml, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setStatus({ kind: 'ok', text: data.message || 'Done.' })
    } catch (e: any) {
      setStatus({ kind: 'err', text: e.message })
    } finally {
      setBusy('')
    }
  }

  const sendToList = () => {
    const n = audienceCount
    const who = n === null ? 'the whole subscriber list' : `${n} subscriber${n === 1 ? '' : 's'}`
    if (window.confirm(`Send this newsletter to ${who}? This cannot be undone.`)) {
      post('send')
    }
  }

  const btn = 'px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700'

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Newsletter</h1>
      <p className="mt-1 text-sm text-gray-500">
        Sends from <span className="font-medium">{from}</span> to the NUMAT Newsletter list
        {audienceCount !== null ? ` (${audienceCount} subscriber${audienceCount === 1 ? '' : 's'})` : ''}.
        Unsubscribe is added automatically.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. NUMAT Update: New engineered bamboo panels"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preview text <span className="text-gray-400">(optional, shows in the inbox after the subject)</span>
          </label>
          <input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="One line summary"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
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
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[260px] w-full rounded border border-gray-300 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-700 prose max-w-none"
          />
          <p className="mt-1 text-xs text-gray-400">
            Tip: keep it simple. Bold, headings, lists, and links work reliably across email apps.
          </p>
        </div>

        {status && (
          <div className={`rounded px-3 py-2 text-sm ${status.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
            {status.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2 border-t border-gray-100">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Send a test to</label>
            <div className="flex gap-2">
              <input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@numat.ph"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy !== ''}
                onClick={() => post('test', { testEmail })}
                className="px-4 py-2 text-sm rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {busy === 'test' ? 'Sending...' : 'Send test'}
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={busy !== ''}
            onClick={sendToList}
            className="px-5 py-2 text-sm rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
          >
            {busy === 'send' ? 'Sending...' : 'Send to list'}
          </button>
        </div>
      </div>
    </div>
  )
}
