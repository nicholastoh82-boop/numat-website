'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Opens a payslip. A blank tab is opened first so the popup is not blocked,
// then pointed at the signed URL once it returns.
export function OpenButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false)
  async function open() {
    setBusy(true)
    const tab = window.open('', '_blank')
    try {
      const res = await fetch(`/api/portal/payslips/open?id=${id}`)
      const j = await res.json()
      if (res.ok && j.url) {
        if (tab) tab.location.href = j.url
        else window.location.href = j.url
      } else {
        if (tab) tab.close()
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
    if (!confirm('Delete this payslip? This cannot be undone.')) return
    setBusy(true)
    try {
      await fetch(`/api/portal/payslips?id=${id}`, { method: 'DELETE' })
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
      className="shrink-0 rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? '...' : 'Delete'}
    </button>
  )
}

export function AdminUpload() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [period, setPeriod] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit() {
    if (!email.trim() || !period.trim() || !file) {
      setMsg('Email, period, and a file are required.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const fd = new FormData()
      fd.set('email', email.trim())
      fd.set('period', period.trim())
      fd.set('file', file)
      const res = await fetch('/api/portal/payslips', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Could not upload.')
        return
      }
      setEmail('')
      setPeriod('')
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
      <h2 className="text-sm font-semibold text-gray-900">Upload a payslip</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Staff email, for example mark@numat.ph"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="Period, for example May 2026"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        type="file"
        accept="application/pdf,image/*"
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
