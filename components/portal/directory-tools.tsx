'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MyDetails({
  initialTitle,
  initialPhone,
}: {
  initialTitle: string
  initialPhone: string
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [phone, setPhone] = useState(initialPhone)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function save() {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/portal/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, phone }),
      })
      if (!res.ok) {
        setMsg('Could not save.')
        return
      }
      setMsg('Saved.')
      router.refresh()
    } catch {
      setMsg('Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">My details</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your job title, for example Head of Growth"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your phone, optional"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save'}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  )
}
