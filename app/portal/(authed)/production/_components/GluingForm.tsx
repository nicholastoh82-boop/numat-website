'use client'
import { useState } from 'react'
const todayISO = () => new Date().toISOString().slice(0, 10)

export default function GluingForm({ userEmail, onSubmitted }: { userEmail: string; onSubmitted: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [slats, setSlats] = useState('')
  const [veneers, setVeneers] = useState('')
  const [downtime, setDowntime] = useState('')
  const [downtimeReason, setDowntimeReason] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const sl = parseInt(slats) || 0
  const v = parseInt(veneers) || 0
  const dt = parseInt(downtime) || 0
  const isValid = sl > 0 && v > 0
  const ratio = v > 0 ? (sl / v).toFixed(1) : '0'

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/production/gluing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date, slats_consumed: sl, veneers_produced: v,
          downtime_min: dt, downtime_reason: downtimeReason || null, notes: notes || null,
          submitted_by: userEmail,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded: ${sl} slats consumed, ${v} veneers produced (${ratio} slats/veneer)` })
      setSlats(''); setVeneers(''); setDowntime(''); setDowntimeReason(''); setNotes('')
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Gluing + 1st heat press</h2>
        <p className="text-xs text-gray-500 mt-0.5">Slats become veneers here. Slat inventory decreases, veneer inventory increases.</p>
      </div>
      <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Slats consumed" required><input type="number" inputMode="numeric" value={slats} onChange={e => setSlats(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Veneers produced" required><input type="number" inputMode="numeric" value={veneers} onChange={e => setVeneers(e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Press downtime (minutes)"><input type="number" inputMode="numeric" value={downtime} onChange={e => setDowntime(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Downtime reason"><input type="text" value={downtimeReason} onChange={e => setDowntimeReason(e.target.value)} placeholder="e.g. heat element check" className={inputCls} /></Field>
      </div>
      <Field label="Notes (optional)"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} /></Field>
      {isValid && <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">Ratio: <strong>{ratio} slats per veneer</strong></div>}
      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : 'Save entry'}</button>
    </div>
  )
}
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900'
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div><label className="block text-xs font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>{children}</div> }
