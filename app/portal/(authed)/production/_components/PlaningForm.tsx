'use client'
import { useState } from 'react'
const todayISO = () => new Date().toISOString().slice(0, 10)

export default function PlaningForm({ userEmail, onSubmitted }: { userEmail: string; onSubmitted: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [slatsIn, setSlatsIn] = useState('')
  const [slatsOut, setSlatsOut] = useState('')
  const [defects, setDefects] = useState('')
  const [downtime, setDowntime] = useState('')
  const [downtimeReason, setDowntimeReason] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const sIn = parseInt(slatsIn) || 0
  const sOut = parseInt(slatsOut) || 0
  const d = parseInt(defects) || 0
  const dt = parseInt(downtime) || 0
  const isValid = sIn > 0 && sOut >= 0 && d >= 0 && sOut + d <= sIn
  const yieldPct = sIn > 0 ? Math.round((sOut / sIn) * 1000) / 10 : 0

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/production/planing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date, slats_in: sIn, slats_out: sOut, defects: d,
          downtime_min: dt, downtime_reason: downtimeReason || null, notes: notes || null,
          submitted_by: userEmail,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded: ${sOut} of ${sIn} slats survived (yield ${yieldPct}%)` })
      setSlatsIn(''); setSlatsOut(''); setDefects(''); setDowntime(''); setDowntimeReason(''); setNotes('')
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Planing run (rough + fine)</h2>
        <p className="text-xs text-gray-500 mt-0.5">Logs yield only. Slat inventory is not affected by this step.</p>
      </div>

      <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Slats into planer" required><input type="number" inputMode="numeric" value={slatsIn} onChange={e => setSlatsIn(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Slats survived" required><input type="number" inputMode="numeric" value={slatsOut} onChange={e => setSlatsOut(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Defects" required><input type="number" inputMode="numeric" value={defects} onChange={e => setDefects(e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Downtime (minutes)"><input type="number" inputMode="numeric" value={downtime} onChange={e => setDowntime(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Downtime reason"><input type="text" value={downtimeReason} onChange={e => setDowntimeReason(e.target.value)} placeholder="e.g. blade change" className={inputCls} /></Field>
      </div>

      <Field label="Notes (optional)"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} /></Field>

      {sIn > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          Yield: <strong>{yieldPct}%</strong>. {sOut + d > sIn && <span className="text-red-600">Survived + Defects exceeds Input.</span>}
        </div>
      )}
      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : 'Save entry'}</button>
    </div>
  )
}
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900'
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div><label className="block text-xs font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>{children}</div> }
