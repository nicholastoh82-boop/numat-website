'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function GenerateForm() {
  const router = useRouter()
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function run() {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/portal/payslips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Could not generate.')
        return
      }
      setMsg(j.count > 0 ? `Generated ${j.count} payslips for ${j.period_label}.` : `No salary payouts found for ${j.period_label}.`)
      router.refresh()
    } catch {
      setMsg('Could not generate.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <h2 className="text-sm font-semibold text-gray-900">Generate payslips</h2>
      <p className="text-xs text-gray-500">
        Builds payslips for a month from the verified salary payouts in your financials. Running it
        again updates that month.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Generating...' : 'Generate'}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  )
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white"
    >
      Download or print
    </button>
  )
}

export function DeletePayslip({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function remove() {
    if (!confirm('Delete this payslip?')) return
    setBusy(true)
    try {
      await fetch(`/api/portal/payslips/generate?id=${id}`, { method: 'DELETE' })
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
