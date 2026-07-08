'use client'
import { useState } from 'react'
import { Field, DefectBins, ShiftOperator, inputCls, todayISO } from './_shared'

const DEFECT_BINS_INIT = { defect_cracks: 0, defect_blue_stain: 0, defect_dimensional: 0, defect_other: 0 }

export default function PlaningForm({ userEmail, onSubmitted }: { userEmail: string; onSubmitted: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [station, setStation] = useState<'rough' | 'fine'>('rough')
  const [slatsIn, setSlatsIn] = useState('')
  const [slatsOut, setSlatsOut] = useState('')
  const [bins, setBins] = useState<Record<string, number>>(DEFECT_BINS_INIT)
  const [downtime, setDowntime] = useState('')
  const [downtimeReason, setDowntimeReason] = useState('')
  const [notes, setNotes] = useState('')
  const [shiftOp, setShiftOp] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const sIn = parseInt(slatsIn) || 0
  const sOut = parseInt(slatsOut) || 0
  const d = Object.values(bins).reduce((a, b) => a + b, 0)
  const dt = parseInt(downtime) || 0
  const isValid = sIn > 0 && sOut >= 0 && sOut + d <= sIn
  const yieldPct = sIn > 0 ? Math.round((sOut / sIn) * 1000) / 10 : 0

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/production/planing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date, station, slats_in: sIn, slats_out: sOut, defects: d,
          downtime_min: dt, downtime_reason: downtimeReason || null, notes: notes || null,
          shift_operator: shiftOp || null, submitted_by: userEmail, ...bins,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded ${station} planing: ${sOut} of ${sIn} slats survived (yield ${yieldPct}%)` })
      setSlatsIn(''); setSlatsOut(''); setBins(DEFECT_BINS_INIT); setDowntime(''); setDowntimeReason(''); setNotes(''); setShiftOp('')
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Planing run</h2>
        <p className="text-xs text-gray-500 mt-0.5">Toggle Rough or Fine. Logs yield + downtime per station so you can see which is the bottleneck.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Station <span className="text-red-500">*</span></label>
        <div className="flex gap-1 border border-gray-200 rounded p-0.5 w-fit">
          <button type="button" onClick={() => setStation('rough')}
            className={`px-4 py-1.5 rounded text-sm ${station === 'rough' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            Rough planer
          </button>
          <button type="button" onClick={() => setStation('fine')}
            className={`px-4 py-1.5 rounded text-sm ${station === 'fine' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            Fine planer
          </button>
        </div>
      </div>

      <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Slats into planer" required><input type="number" inputMode="numeric" value={slatsIn} onChange={e => setSlatsIn(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Slats survived" required><input type="number" inputMode="numeric" value={slatsOut} onChange={e => setSlatsOut(e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>

      <DefectBins
        bins={[
          { key: 'defect_cracks', label: 'Cracks', value: bins.defect_cracks },
          { key: 'defect_blue_stain', label: 'Blue stain', value: bins.defect_blue_stain },
          { key: 'defect_dimensional', label: 'Dimensional', value: bins.defect_dimensional },
          { key: 'defect_other', label: 'Other', value: bins.defect_other },
        ]}
        onChange={(k, v) => setBins({ ...bins, [k]: v })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Downtime (minutes)"><input type="number" inputMode="numeric" value={downtime} onChange={e => setDowntime(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Downtime reason"><input type="text" value={downtimeReason} onChange={e => setDowntimeReason(e.target.value)} placeholder="e.g. blade change" className={inputCls} /></Field>
      </div>

      <ShiftOperator value={shiftOp} onChange={setShiftOp} />
      <Field label="Notes"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} /></Field>

      {sIn > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          Yield: <strong>{yieldPct}%</strong>. {sOut + d > sIn && <span className="text-red-600">Survived + Defects exceeds Input.</span>}
        </div>
      )}
      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : `Save ${station} entry`}</button>
    </div>
  )
}
