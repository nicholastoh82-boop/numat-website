'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Admin only. Posts a new announcement, then refreshes the server rendered list.
export function AnnouncementComposer() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!title.trim() || !body.trim()) {
      setError('Title and message are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/portal/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), pinned }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Could not post.')
        return
      }
      setTitle('')
      setBody('')
      setPinned(false)
      router.refresh()
    } catch {
      setError('Could not post.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">New announcement</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message"
        rows={4}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
        />
        Pin to top
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Posting...' : 'Post announcement'}
      </button>
    </div>
  )
}

// Admin only. Removes one announcement, then refreshes the list.
export function DeleteAnnouncementButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function del() {
    if (!confirm('Delete this announcement?')) return
    setBusy(true)
    try {
      await fetch('/api/portal/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={del}
      disabled={busy}
      className="shrink-0 text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
    >
      Delete
    </button>
  )
}
