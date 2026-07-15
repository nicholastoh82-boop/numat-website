'use client'
import { useState } from 'react'
import { Field, DefectBins, ShiftOperator, inputCls, todayISO } from './_shared'

const DEFECT_INIT = { defect_surface: 0, defect_dimensional: 0, defect_glue_bleed: 0, defect_other: 0 }

export default function VeneerSandingForm({ userEmail, onSubmitted }: { userEmail: string; onSubmitted: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [vIn, setVIn] = useState('')
  const [vPassed, setVPassed] = useState('')
  const [bins, setBins] = useState<Record<string, number>>(DEFECT_INIT)
  const [notes, setNotes] = useState('')
  const [shiftOp, setShiftOp] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const i = parseInt(vIn) || 0
  const p = parseInt(vPassed) || 0
  const d = Object.values(bins).reduce((a, b) => a + b, 0)
  const isValid = i > 0 && p >= 0 && p + d <= i
  const passRate = i > 0 ? Math.round((p / i) * 1000) / 10 : 0

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/production/veneer-sanding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date, veneers_in: i, veneers_passed: p, defects: d,
          notes: notes || null, shift_operator: shiftOp || null, submitted_by: userEmail, ...bins,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded: ${p} veneers passed, ${d} defects (pass rate ${passRate}%)` })
      setVIn(''); setVPassed(''); setBins(DEFECT_INIT); setNotes(''); setShiftOp('')
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Veneer sanding QA</h2>
        <p className="text-xs text-gray-500 mt-0.5">Defects are removed from veneer inventory. Use the bins to categorise what you're seeing.</p>
      </div>
      <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Veneers sanded" required><input type="number" inputMode="numeric" value={vIn} onChange={e => setVIn(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Passed QA" required><input type="number" inputMode="numeric" value={vPassed} onChange={e => setVPassed(e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>
      <DefectBins
        bins={[
          { key: 'defect_surface', label: 'Surface', value: bins.defect_surface },
          { key: 'defect_dimensional', label: 'Dimensional', value: bins.defect_dimensional },
          { key: 'defect_glue_bleed', label: 'Glue bleed', value: bins.defect_glue_bleed },
          { key: 'defect_other', label: 'Other', value: bins.defect_other },
        ]}
        onChange={(k, v) => setBins({ ...bins, [k]: v })}
      />
      <ShiftOperator value={shiftOp} onChange={setShiftOp} />
      <Field label="Notes"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} /></Field>
      {i > 0 && <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">Pass rate: <strong>{passRate}%</strong>. {p + d > i && <span className="text-red-600">Passed + Defects exceeds sanded count.</span>}</div>}
      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : 'Save entry'}</button>
    </div>
  )
}
