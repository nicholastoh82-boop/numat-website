'use client'
import { useState } from 'react'
import type { Variant } from './ProductionShell'
const todayISO = () => new Date().toISOString().slice(0, 10)

type Props = { userEmail: string; variants: Variant[]; onSubmitted: () => void }

export default function BoardRunForm({ userEmail, variants, onSubmitted }: Props) {
  const [date, setDate] = useState(todayISO())
  const [variantId, setVariantId] = useState('')
  const [veneers, setVeneers] = useState('')
  const [boardsProd, setBoardsProd] = useState('')
  const [boardsPass, setBoardsPass] = useState('')
  const [defects, setDefects] = useState('')
  const [downtime, setDowntime] = useState('')
  const [downtimeReason, setDowntimeReason] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const variant = variants.find(v => v.id === variantId) || null
  const ply = variant?.ply_count || 0

  const v = parseInt(veneers) || 0
  const bp = parseInt(boardsProd) || 0
  const bpa = parseInt(boardsPass) || 0
  const d = parseInt(defects) || 0
  const dt = parseInt(downtime) || 0
  const isValid = !!variantId && ply > 0 && v > 0 && bp >= 0 && bpa >= 0 && d >= 0 && bpa + d <= bp
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
          submitted_by: userEmail,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      setMsg({ kind: 'ok', text: `Recorded: ${bpa} boards added to inventory (${variant!.sku})` })
      setVariantId(''); setVeneers(''); setBoardsProd(''); setBoardsPass(''); setDefects(''); setDowntime(''); setDowntimeReason(''); setNotes('')
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Board run (2nd press + sanding)</h2>
        <p className="text-xs text-gray-500 mt-0.5">Veneers become boards here. Pick the SKU you produced.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Board SKU" required>
          <select value={variantId} onChange={e => setVariantId(e.target.value)} className={inputCls}>
            <option value="">Select board.</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>{v.sku}{v.ply_count ? ` (${v.ply_count} ply)` : ''}</option>
            ))}
          </select>
        </Field>
      </div>
      {variant && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          {variant.products?.name || 'Board'} · {variant.size_label || 'no size'} · {variant.ply_count || '?'} ply
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Veneers consumed" required><input type="number" inputMode="numeric" value={veneers} onChange={e => setVeneers(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Boards pressed" required><input type="number" inputMode="numeric" value={boardsProd} onChange={e => setBoardsProd(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Passed sanding" required><input type="number" inputMode="numeric" value={boardsPass} onChange={e => setBoardsPass(e.target.value)} placeholder="0" className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Defects"><input type="number" inputMode="numeric" value={defects} onChange={e => setDefects(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Press downtime (min)"><input type="number" inputMode="numeric" value={downtime} onChange={e => setDowntime(e.target.value)} placeholder="0" className={inputCls} /></Field>
        <Field label="Downtime reason"><input type="text" value={downtimeReason} onChange={e => setDowntimeReason(e.target.value)} placeholder="e.g. cooling" className={inputCls} /></Field>
      </div>
      <Field label="Notes (optional)"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} /></Field>
      {bp > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 space-y-0.5">
          <div>Veneers per board: <strong>{veneersPerBoard}</strong> {ply > 0 && <span className="text-gray-400">(target {ply})</span>}</div>
          <div>Board pass rate: <strong>{boardYield}%</strong></div>
          {bpa + d > bp && <div className="text-red-600">Passed + Defects exceeds Boards pressed.</div>}
        </div>
      )}
      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : 'Save entry'}</button>
    </div>
  )
}
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900'
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div><label className="block text-xs font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>{children}</div> }
