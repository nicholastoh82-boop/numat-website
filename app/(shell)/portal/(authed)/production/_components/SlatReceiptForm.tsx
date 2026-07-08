'use client'
import { useState } from 'react'
import { Field, DefectBins, ShiftOperator, inputCls, todayISO } from './_shared'

type Props = { userEmail: string; onSubmitted: () => void }

const REJECT_BINS_INIT = { reject_cracks: 0, reject_blue_stain: 0, reject_insect: 0, reject_undersized: 0, reject_moisture: 0, reject_other: 0 }
const REJECT_BIN_LABELS: Record<string, string> = {
  reject_cracks: 'Cracks', reject_blue_stain: 'Blue stain', reject_insect: 'Insect',
  reject_undersized: 'Undersized', reject_moisture: 'Moisture', reject_other: 'Other',
}

export default function SlatReceiptForm({ userEmail, onSubmitted }: Props) {
  const [date, setDate] = useState(todayISO())
  const [supplier, setSupplier] = useState('')
  const [received, setReceived] = useState('')
  const [passed, setPassed] = useState('')
  const [mcAvg, setMcAvg] = useState(''); const [mcMin, setMcMin] = useState(''); const [mcMax, setMcMax] = useState('')
  const [bins, setBins] = useState<Record<string, number>>(REJECT_BINS_INIT)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [shiftOp, setShiftOp] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const r = parseInt(received) || 0
  const p = parseInt(passed) || 0
  const j = Object.values(bins).reduce((a, b) => a + b, 0)
  const isValid = r > 0 && p >= 0 && j >= 0 && p + j <= r
  const passRate = r > 0 ? Math.round((p / r) * 1000) / 10 : 0
  const mcWarning = mcAvg && parseFloat(mcAvg) > 14
  const mcPeakWarning = mcMax && parseFloat(mcMax) > 18

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/production/slat-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date, supplier: supplier || null,
          slats_received: r, slats_passed: p, slats_rejected: j,
          mc_avg: mcAvg || null, mc_min: mcMin || null, mc_max: mcMax || null,
          ...bins,
          reject_reason: reason || null, notes: notes || null,
          shift_operator: shiftOp || null, submitted_by: userEmail,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded: ${p} slats added to inventory (pass rate ${passRate}%)` })
      setSupplier(''); setReceived(''); setPassed(''); setMcAvg(''); setMcMin(''); setMcMax('')
      setBins(REJECT_BINS_INIT); setReason(''); setNotes(''); setShiftOp('')
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Slats received from supplier</h2>
        <p className="text-xs text-gray-500 mt-0.5">Take 5 random moisture readings across the pile. Reject if avg &gt; 14% or any reading &gt; 18%.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Supplier"><input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. ABC Bamboo" className={inputCls} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Slats received" required><input type="number" inputMode="numeric" value={received} onChange={e => setReceived(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Slats passed QA" required><input type="number" inputMode="numeric" value={passed} onChange={e => setPassed(e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded p-3 space-y-2">
        <div className="text-xs font-medium text-blue-900">Moisture content (%) — 5 random readings, enter avg/min/max</div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Avg %"><input type="number" inputMode="decimal" step="0.1" value={mcAvg} onChange={e => setMcAvg(e.target.value)} placeholder="10.5" className={inputCls} /></Field>
          <Field label="Min %"><input type="number" inputMode="decimal" step="0.1" value={mcMin} onChange={e => setMcMin(e.target.value)} placeholder="9.0" className={inputCls} /></Field>
          <Field label="Max %"><input type="number" inputMode="decimal" step="0.1" value={mcMax} onChange={e => setMcMax(e.target.value)} placeholder="12.0" className={inputCls} /></Field>
        </div>
        {mcWarning && <p className="text-xs text-red-700">Warning: average &gt; 14%, this lot is too wet for processing.</p>}
        {mcPeakWarning && <p className="text-xs text-red-700">Warning: peak reading &gt; 18%, reject this lot.</p>}
      </div>

      <DefectBins
        bins={[
          { key: 'reject_cracks', label: REJECT_BIN_LABELS.reject_cracks, value: bins.reject_cracks },
          { key: 'reject_blue_stain', label: REJECT_BIN_LABELS.reject_blue_stain, value: bins.reject_blue_stain },
          { key: 'reject_insect', label: REJECT_BIN_LABELS.reject_insect, value: bins.reject_insect },
          { key: 'reject_undersized', label: REJECT_BIN_LABELS.reject_undersized, value: bins.reject_undersized },
          { key: 'reject_moisture', label: REJECT_BIN_LABELS.reject_moisture, value: bins.reject_moisture },
          { key: 'reject_other', label: REJECT_BIN_LABELS.reject_other, value: bins.reject_other },
        ]}
        onChange={(k, v) => setBins({ ...bins, [k]: v })}
        helperText="Sum of all bins = total rejected. Tap +/- to count."
      />

      <Field label="Notes about rejections"><input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. last 50 slats from same pallet had cracks" className={inputCls} /></Field>
      <ShiftOperator value={shiftOp} onChange={setShiftOp} />
      <Field label="General notes"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} /></Field>

      {r > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          Pass rate: <strong>{passRate}%</strong>. {p + j > r && <span className="text-red-600">Passed + Rejected (from bins) exceeds Received.</span>}
        </div>
      )}
      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : 'Save entry'}</button>
    </div>
  )
}
