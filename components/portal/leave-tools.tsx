'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TYPES = [
  { value: 'annual', label: 'Annual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'unpaid', label: 'Unpaid leave' },
  { value: 'other', label: 'Other' },
]

// Anyone with the leave feature can submit a request.
export function LeaveRequestForm() {
  const router = useRouter()
  const [leaveType, setLeaveType] = useState('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  async function submit() {
    if (!startDate || !endDate) {
      setError('Pick both dates.')
      return
    }
    if (endDate < startDate) {
      setError('End date cannot be before the start date.')
      return
    }
    setBusy(true)
    setError('')
    setOk(false)
    try {
      const res = await fetch('/api/portal/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveType, startDate, endDate, reason }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Could not submit.')
        return
      }
      setStartDate('')
      setEndDate('')
      setReason('')
      setOk(true)
      router.refresh()
    } catch {
      setError('Could not submit.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Request leave</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Type</span>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-gray-600">Reason (optional)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-700">Request submitted.</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Submitting...' : 'Submit request'}
      </button>
    </div>
  )
}

// Admin only. Approves or rejects a pending request.
export function LeaveDecision({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function decide(decision: 'approved' | 'rejected') {
    setBusy(true)
    try {
      await fetch('/api/portal/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={() => decide('approved')}
        disabled={busy}
        className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => decide('rejected')}
        disabled={busy}
        className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  )
}
