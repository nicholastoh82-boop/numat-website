'use client'
import { useState } from 'react'
import { Field, ShiftOperator, inputCls } from './_shared'

const ADHESIVES = [
  { value: 'PRF_R22_017', label: 'PRF R22-017 (RI Chem)' },
  { value: 'PF_R22_012', label: 'PF R22-012 (RI Chem)' },
  { value: 'LoFoUF_R21_036', label: 'LoFoUF R21-036 (RI Chem, H351)' },
]

type Props = { onClose: () => void; onCreated: (batch: { id: string; batch_label: string; adhesive_type: string; mix_datetime: string }) => void; userEmail: string }

export default function AdhesiveBatchModal({ onClose, onCreated, userEmail }: Props) {
  const nowLocal = (() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })()
  const [label, setLabel] = useState('')
  const [type, setType] = useState('PRF_R22_017')
  const [mixAt, setMixAt] = useState(nowLocal)
  const [ratio, setRatio] = useState('')
  const [tempC, setTempC] = useState('')
  const [rh, setRh] = useState('')
  const [notes, setNotes] = useState('')
  const [mixedBy, setMixedBy] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isValid = label.trim() && type && mixAt && mixedBy

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/production/adhesive-batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_label: label.trim(), adhesive_type: type,
          mix_datetime: new Date(mixAt).toISOString(),
          mix_ratio: ratio || null, ambient_temp_c: tempC || null, ambient_rh_pct: rh || null,
          mixed_by: mixedBy, notes: notes || null,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      onCreated(out.batch)
      onClose()
    } catch (e: any) { setErr(e?.message || 'Failed to create batch') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Mix new adhesive batch</h2>
          <p className="text-xs text-gray-500 mt-0.5">Logs the mix so any future delamination can be traced back.</p>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
          <Field label="Batch label" required hint="e.g. Batch 042"><input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Batch 042" className={inputCls} /></Field>
          <Field label="Adhesive type" required>
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
              {ADHESIVES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>
          <Field label="Mix date and time" required><input type="datetime-local" value={mixAt} onChange={e => setMixAt(e.target.value)} className={inputCls} /></Field>
          <Field label="Mix ratio" hint="e.g. 100:20 (resin:hardener), or 'as supplied' if pre-mixed"><input type="text" value={ratio} onChange={e => setRatio(e.target.value)} placeholder="100:20" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ambient temp (°C)"><input type="number" inputMode="decimal" step="0.1" value={tempC} onChange={e => setTempC(e.target.value)} placeholder="28.0" className={inputCls} /></Field>
            <Field label="Ambient RH (%)"><input type="number" inputMode="decimal" step="0.1" value={rh} onChange={e => setRh(e.target.value)} placeholder="65.0" className={inputCls} /></Field>
          </div>
          <ShiftOperator value={mixedBy} onChange={setMixedBy} />
          <Field label="Notes"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} placeholder="Any quirks during the mix" /></Field>
          {err && <div className="text-sm rounded p-3 bg-red-50 text-red-800">{err}</div>}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={submit} disabled={!isValid || busy} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50">{busy ? 'Saving.' : 'Create batch'}</button>
        </div>
      </div>
    </div>
  )
}
