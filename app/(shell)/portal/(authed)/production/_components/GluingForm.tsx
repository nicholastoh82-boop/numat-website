'use client'
import { useEffect, useState } from 'react'
import { Field, DefectBins, ShiftOperator, inputCls, todayISO } from './_shared'
import AdhesiveBatchModal from './AdhesiveBatchModal'

type Batch = { id: string; batch_label: string; adhesive_type: string; mix_datetime: string }
const DEFECT_INIT = { defect_bond_fail: 0, defect_blowout: 0, defect_other: 0 }

export default function GluingForm({ userEmail, onSubmitted }: { userEmail: string; onSubmitted: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [batches, setBatches] = useState<Batch[]>([])
  const [batchId, setBatchId] = useState('')
  const [showMix, setShowMix] = useState(false)
  const [slats, setSlats] = useState('')
  const [veneers, setVeneers] = useState('')
  const [prePressMc, setPrePressMc] = useState('')
  const [spread, setSpread] = useState('')
  const [bins, setBins] = useState<Record<string, number>>(DEFECT_INIT)
  const [downtime, setDowntime] = useState('')
  const [downtimeReason, setDowntimeReason] = useState('')
  const [notes, setNotes] = useState('')
  const [shiftOp, setShiftOp] = useState('')
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

  const sl = parseInt(slats) || 0
  const v = parseInt(veneers) || 0
  const dt = parseInt(downtime) || 0
  const isValid = !!batchId && sl > 0 && v > 0
  const ratio = v > 0 ? (sl / v).toFixed(1) : '0'
  const mcWarn = prePressMc && parseFloat(prePressMc) > 12
  const mcLow = prePressMc && parseFloat(prePressMc) < 8

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/production/gluing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: date, adhesive_batch_id: batchId,
          slats_consumed: sl, veneers_produced: v,
          pre_press_mc_avg: prePressMc || null, spread_rate_g_m2: spread || null,
          downtime_min: dt, downtime_reason: downtimeReason || null, notes: notes || null,
          shift_operator: shiftOp || null, submitted_by: userEmail, ...bins,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded: ${sl} slats consumed, ${v} veneers produced (${ratio} slats/veneer)` })
      setSlats(''); setVeneers(''); setPrePressMc(''); setSpread(''); setBins(DEFECT_INIT)
      setDowntime(''); setDowntimeReason(''); setNotes(''); setShiftOp('')
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Gluing + 1st heat press</h2>
        <p className="text-xs text-gray-500 mt-0.5">Pick the adhesive batch in use. Take 3 random pre-press moisture readings (top, middle, bottom of stack). Target 8–12% MC.</p>
      </div>

      <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Adhesive batch <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          <select value={batchId} onChange={e => setBatchId(e.target.value)} className={inputCls + ' flex-1'}>
            <option value="">Select batch.</option>
            {batches.map(b => {
              const age = Math.round((Date.now() - new Date(b.mix_datetime).getTime()) / 60000)
              return <option key={b.id} value={b.id}>{b.batch_label} · {b.adhesive_type} · mixed {age} min ago</option>
            })}
          </select>
          <button type="button" onClick={() => setShowMix(true)} className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 whitespace-nowrap">Mix new</button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Only batches mixed in the last 60 days are shown.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Slats consumed" required><input type="number" inputMode="numeric" value={slats} onChange={e => setSlats(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Veneers produced" required><input type="number" inputMode="numeric" value={veneers} onChange={e => setVeneers(e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded p-3 space-y-2">
        <div className="text-xs font-medium text-blue-900">Pre-press checks</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pre-press MC avg %" hint="3 random readings, target 8-12%"><input type="number" inputMode="decimal" step="0.1" value={prePressMc} onChange={e => setPrePressMc(e.target.value)} placeholder="10.5" className={inputCls} /></Field>
          <Field label="Spread rate g/m²" hint="optional, glue applied"><input type="number" inputMode="decimal" step="0.1" value={spread} onChange={e => setSpread(e.target.value)} placeholder="180" className={inputCls} /></Field>
        </div>
        {mcWarn && <p className="text-xs text-red-700">Warning: MC &gt; 12%, expect blistering or delamination.</p>}
        {mcLow && <p className="text-xs text-amber-700">Warning: MC &lt; 8%, may compromise bond.</p>}
      </div>

      <DefectBins
        bins={[
          { key: 'defect_bond_fail', label: 'Bond failure', value: bins.defect_bond_fail },
          { key: 'defect_blowout', label: 'Blowout', value: bins.defect_blowout },
          { key: 'defect_other', label: 'Other', value: bins.defect_other },
        ]}
        onChange={(k, v) => setBins({ ...bins, [k]: v })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Press downtime (minutes)"><input type="number" inputMode="numeric" value={downtime} onChange={e => setDowntime(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Downtime reason"><input type="text" value={downtimeReason} onChange={e => setDowntimeReason(e.target.value)} placeholder="e.g. heat element check" className={inputCls} /></Field>
      </div>

      <ShiftOperator value={shiftOp} onChange={setShiftOp} />
      <Field label="Notes"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} /></Field>

      {isValid && <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">Ratio: <strong>{ratio} slats per veneer</strong></div>}
      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : 'Save entry'}</button>

      {showMix && <AdhesiveBatchModal userEmail={userEmail} onClose={() => setShowMix(false)} onCreated={(b) => { loadBatches().then(() => setBatchId(b.id)) }} />}
    </div>
  )
}
