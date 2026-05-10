'use client'

import { useState } from 'react'

const todayISO = () => new Date().toISOString().slice(0, 10)

type Props = { userEmail: string; onSubmitted: () => void }

export default function SlatReceiptForm({ userEmail, onSubmitted }: Props) {
  const [date, setDate] = useState(todayISO())
  const [supplier, setSupplier] = useState('')
  const [received, setReceived] = useState('')
  const [passed, setPassed] = useState('')
  const [rejected, setRejected] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const r = parseInt(received) || 0
  const p = parseInt(passed) || 0
  const j = parseInt(rejected) || 0
  const isValid = r > 0 && p >= 0 && j >= 0 && p + j <= r
  const passRate = r > 0 ? Math.round((p / r) * 1000) / 10 : 0

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/production/slat-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date,
          supplier: supplier || null,
          slats_received: r,
          slats_passed: p,
          slats_rejected: j,
          reject_reason: reason || null,
          notes: notes || null,
          submitted_by: userEmail,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded: ${p} slats added to inventory (pass rate ${passRate}%)` })
      setSupplier(''); setReceived(''); setPassed(''); setRejected(''); setReason(''); setNotes('')
      onSubmitted()
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || 'Failed to submit' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Slats received from supplier</h2>
        <p className="text-xs text-gray-500 mt-0.5">Log each delivery + your QA result. Passed slats add to inventory.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Supplier (optional)">
          <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. ABC Bamboo" className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Slats received" required>
          <input type="number" inputMode="numeric" value={received} onChange={e => setReceived(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
        <Field label="Passed QA" required>
          <input type="number" inputMode="numeric" value={passed} onChange={e => setPassed(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
        <Field label="Rejected" required>
          <input type="number" inputMode="numeric" value={rejected} onChange={e => setRejected(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
      </div>

      <Field label="Rejection reason (if any)">
        <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. cracked, moisture, undersized" className={inputCls} />
      </Field>

      <Field label="Notes (optional)">
        <textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} />
      </Field>

      {r > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          Pass rate: <strong>{passRate}%</strong>. {p + j > r && <span className="text-red-600">Passed + Rejected exceeds Received.</span>}
        </div>
      )}

      {msg && (
        <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>
      )}

      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">
        {busy ? 'Saving.' : 'Save entry'}
      </button>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
