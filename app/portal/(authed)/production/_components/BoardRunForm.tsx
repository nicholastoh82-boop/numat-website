'use client'
import { useEffect, useState } from 'react'
import { Field, DefectBins, ShiftOperator, inputCls, todayISO } from './_shared'
import AdhesiveBatchModal from './AdhesiveBatchModal'
import type { Variant } from './ProductionShell'

type Batch = { id: string; batch_label: string; adhesive_type: string; mix_datetime: string }
const DEFECT_INIT = { defect_delamination: 0, defect_surface: 0, defect_dimensional: 0, defect_glue_bleed: 0, defect_other: 0 }

export default function BoardRunForm({ userEmail, variants, onSubmitted }: { userEmail: string; variants: Variant[]; onSubmitted: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [variantId, setVariantId] = useState('')
  const [veneers, setVeneers] = useState('')
  const [boardsProd, setBoardsProd] = useState('')
  const [boardsPass, setBoardsPass] = useState('')
  const [bins, setBins] = useState<Record<string, number>>(DEFECT_INIT)
  const [downtime, setDowntime] = useState('')
  const [downtimeReason, setDowntimeReason] = useState('')
  const [notes, setNotes] = useState('')
  const [shiftOp, setShiftOp] = useState('')
  // Adhesive batch + press parameters
  const [batches, setBatches] = useState<Batch[]>([])
  const [batchId, setBatchId] = useState('')
  const [showMix, setShowMix] = useState(false)
  const [platenC, setPlatenC] = useState('')
  const [pressureBar, setPressureBar] = useState('')
  const [pressMin, setPressMin] = useState('')
  const [closeSec, setCloseSec] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const loadBatches = async () => {
    try {
      const res = await fetch('/api/production/adhesive-batches', { cache: 'no-store' })
      const out = await res.json()
      setBatches(out.batches || [])
    } catch {}
  }
  useEffect(() => { loadBatches() }, [])

  const variant = variants.find(v => v.id === variantId) || null
  const ply = variant?.ply_count || 0
  const v = parseInt(veneers) || 0
  const bp = parseInt(boardsProd) || 0
  const bpa = parseInt(boardsPass) || 0
  const d = Object.values(bins).reduce((a, b) => a + b, 0)
  const dt = parseInt(downtime) || 0
  const isValid = !!variantId && ply > 0 && v > 0 && bp >= 0 && bpa >= 0 && bpa + d <= bp
  const veneersPerBoard = bp > 0 ? (v / bp).toFixed(2) : '0'
  const boardYield = bp > 0 ? Math.round((bpa / bp) * 1000) / 10 : 0

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/production/board-run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date, variant_id: variantId, sku_snapshot: variant!.sku, ply_count: ply,
          veneers_consumed: v, boards_produced: bp, boards_passed: bpa, defects: d,
          downtime_min: dt, downtime_reason: downtimeReason || null, notes: notes || null,
          shift_operator: shiftOp || null, submitted_by: userEmail,
          adhesive_batch_id: batchId || null,
          platen_temp_c: platenC || null, pressure_bar: pressureBar || null,
          press_time_min: pressMin || null, close_time_sec: closeSec || null,
          ...bins,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded: ${bpa} boards added to inventory (${variant!.sku})` })
      setVariantId(''); setVeneers(''); setBoardsProd(''); setBoardsPass(''); setBins(DEFECT_INIT)
      setDowntime(''); setDowntimeReason(''); setNotes(''); setShiftOp('')
      setBatchId(''); setPlatenC(''); setPressureBar(''); setPressMin(''); setCloseSec('')
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Board run (2nd press + sanding)</h2>
        <p className="text-xs text-gray-500 mt-0.5">Pick the SKU you produced. Read the press gauges and log them, this is what lets us trace future delamination.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Board SKU" required>
          <select value={variantId} onChange={e => setVariantId(e.target.value)} className={inputCls}>
            <option value="">Select board.</option>
            {variants.map(v => <option key={v.id} value={v.id}>{v.sku}{v.ply_count ? ` (${v.ply_count} ply)` : ''}</option>)}
          </select>
        </Field>
      </div>
      {variant && <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">{variant.products?.name || 'Board'} · {variant.size_label || 'no size'} · {variant.ply_count || '?'} ply</div>}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Adhesive batch <span className="font-normal text-gray-400">(optional)</span></label>
        <div className="flex gap-2">
          <select value={batchId} onChange={e => setBatchId(e.target.value)} className={inputCls + ' flex-1'}>
            <option value="">Not specified</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_label} · {b.adhesive_type}</option>)}
          </select>
          <button type="button" onClick={() => setShowMix(true)} className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 whitespace-nowrap">Mix new</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Veneers consumed" required><input type="number" inputMode="numeric" value={veneers} onChange={e => setVeneers(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Boards pressed" required><input type="number" inputMode="numeric" value={boardsProd} onChange={e => setBoardsProd(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Passed sanding" required><input type="number" inputMode="numeric" value={boardsPass} onChange={e => setBoardsPass(e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded p-3 space-y-2">
        <div className="text-xs font-medium text-amber-900">Press parameters (read off gauges)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Field label="Platen °C" hint="e.g. 130"><input type="number" inputMode="decimal" step="0.1" value={platenC} onChange={e => setPlatenC(e.target.value)} placeholder="130" className={inputCls} /></Field>
          <Field label="Pressure (bar)" hint="e.g. 12"><input type="number" inputMode="decimal" step="0.1" value={pressureBar} onChange={e => setPressureBar(e.target.value)} placeholder="12" className={inputCls} /></Field>
          <Field label="Press time (min)" hint="hold time"><input type="number" inputMode="decimal" step="0.1" value={pressMin} onChange={e => setPressMin(e.target.value)} placeholder="8.0" className={inputCls} /></Field>
          <Field label="Close time (sec)" hint="glue→close"><input type="number" inputMode="numeric" value={closeSec} onChange={e => setCloseSec(e.target.value)} placeholder="60" className={inputCls} /></Field>
        </div>
      </div>

      <DefectBins
        bins={[
          { key: 'defect_delamination', label: 'Delamination', value: bins.defect_delamination },
          { key: 'defect_surface', label: 'Surface', value: bins.defect_surface },
          { key: 'defect_dimensional', label: 'Dimensional', value: bins.defect_dimensional },
          { key: 'defect_glue_bleed', label: 'Glue bleed', value: bins.defect_glue_bleed },
          { key: 'defect_other', label: 'Other', value: bins.defect_other },
        ]}
        onChange={(k, v) => setBins({ ...bins, [k]: v })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Press downtime (min)"><input type="number" inputMode="numeric" value={downtime} onChange={e => setDowntime(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Downtime reason"><input type="text" value={downtimeReason} onChange={e => setDowntimeReason(e.target.value)} placeholder="e.g. cooling" className={inputCls} /></Field>
      </div>
      <ShiftOperator value={shiftOp} onChange={setShiftOp} />
      <Field label="Notes"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} /></Field>

      {bp > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 space-y-0.5">
          <div>Veneers per board: <strong>{veneersPerBoard}</strong> {ply > 0 && <span className="text-gray-400">(target {ply})</span>}</div>
          <div>Board pass rate: <strong>{boardYield}%</strong></div>
          {bpa + d > bp && <div className="text-red-600">Passed + Defects exceeds Boards pressed.</div>}
        </div>
      )}
      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : 'Save entry'}</button>

      {showMix && <AdhesiveBatchModal userEmail={userEmail} onClose={() => setShowMix(false)} onCreated={(b) => { loadBatches().then(() => setBatchId(b.id)) }} />}
    </div>
  )
}
