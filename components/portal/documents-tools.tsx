'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['SOP', 'Role manual', 'Safety data sheet', 'Certification', 'Other']

export function OpenButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false)
  async function open() {
    setBusy(true)
    const tab = window.open('', '_blank')
    try {
      const res = await fetch(`/api/portal/documents/open?id=${id}`)
      const j = await res.json()
      if (res.ok && j.url) {
        if (tab) tab.location.href = j.url
        else window.location.href = j.url
      } else if (tab) {
        tab.close()
      }
    } catch {
      if (tab) tab.close()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
    >
      {busy ? 'Opening...' : 'Open'}
    </button>
  )
}

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function remove() {
    if (!confirm('Delete this document?')) return
    setBusy(true)
    try {
      await fetch(`/api/portal/documents?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? '...' : 'Delete'}
    </button>
  )
}

export function AdminUpload() {
  const router = useRouter()
  const [category, setCategory] = useState('SOP')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit() {
    if (!title.trim() || !file) {
      setMsg('A title and a file are required.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const fd = new FormData()
      fd.set('category', category)
      fd.set('title', title.trim())
      fd.set('notes', notes.trim())
      fd.set('file', file)
      const res = await fetch('/api/portal/documents', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Could not upload.')
        return
      }
      setTitle('')
      setNotes('')
      setFile(null)
      setMsg('Uploaded.')
      router.refresh()
    } catch {
      setMsg('Could not upload.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Upload a document</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title, for example Adhesive R22 017 safety sheet"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes, optional"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="file"
        accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Uploading...' : 'Upload'}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  )
}
