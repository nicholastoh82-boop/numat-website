'use client'
import { useEffect, useState } from 'react'
import { Field, ShiftOperator, inputCls, todayISO } from './_shared'

type Batch = {
  id: string
  event_date: string
  supplier: string | null
  slats_received: number
  slats_passed: number
  borax_test_status: 'not_tested' | 'passed' | 'flagged_for_review' | 'reviewed_ok' | 'rejected'
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_tested: { label: 'Not tested', color: 'bg-gray-100 text-gray-700' },
  passed: { label: 'Passed', color: 'bg-green-100 text-green-800' },
  flagged_for_review: { label: 'Flagged for review', color: 'bg-red-100 text-red-800' },
  reviewed_ok: { label: 'Reviewed OK', color: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', color: 'bg-red-200 text-red-900' },
}

type Props = { userEmail: string; onSubmitted: () => void }

export default function BoraxTestForm({ userEmail, onSubmitted }: Props) {
  const [date, setDate] = useState(todayISO())
  const [batches, setBatches] = useState<Batch[]>([])
  const [batchId, setBatchId] = useState('')
  const [pass, setPass] = useState('')
  const [fail, setFail] = useState('')
  const [notes, setNotes] = useState('')
  const [shiftOp, setShiftOp] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null)

  const loadBatches = async () => {
    setLoadingBatches(true)
    try {
      const res = await fetch('/api/production/slat-receipts-for-test', { cache: 'no-store' })
      const out = await res.json()
      setBatches(out.rows || [])
    } catch {} finally { setLoadingBatches(false) }
  }
  useEffect(() => { loadBatches() }, [])

  const batch = batches.find(b => b.id === batchId) || null
  const p = parseInt(pass) || 0
  const f = parseInt(fail) || 0
  const totalTested = p + f
  // 5% of slats_received (rounded up)
  const recommended = batch ? Math.ceil(batch.slats_received * 0.05) : 0
  const isValid = !!batchId && totalTested > 0 && p >= 0 && f >= 0
  const willFlag = f > 0
  const willPass = p > 0 && f === 0

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/production/borax-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slat_receipt_id: batchId, event_date: date,
          slats_pass: p, slats_fail: f,
          notes: notes || null, shift_operator: shiftOp || null,
        }),
      })
      const out = await res.json()
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`)
      const verdictText = willFlag
        ? `${f} slat(s) failed the test. Batch flagged for review by Mark or Bryan before further use.`
        : `All ${p} tested slats passed. Batch marked as passed.`
      setMsg({ kind: willFlag ? 'warn' : 'ok', text: `Recorded: ${verdictText}` })
      setBatchId(''); setPass(''); setFail(''); setNotes(''); setShiftOp('')
      loadBatches()
      onSubmitted()
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'Failed to submit' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Borax / boric treatment verification</h2>
        <p className="text-xs text-gray-500 mt-0.5">Pick a delivery batch, test 5% with turmeric + ethanol solution, log how many turned red (passed) vs stayed yellow (failed).</p>
      </div>

      <Field label="Test date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>

      <Field label="Delivery batch" required hint="Shows untested batches and recent batches (last 14 days)">
        {loadingBatches ? (
          <p className="text-xs text-gray-400">Loading.</p>
        ) : batches.length === 0 ? (
          <p className="text-xs text-gray-500">No slat receipts available. Log a delivery in Slats In first.</p>
        ) : (
          <select value={batchId} onChange={e => setBatchId(e.target.value)} className={inputCls}>
            <option value="">Select batch.</option>
            {batches.map(b => {
              const status = STATUS_LABELS[b.borax_test_status] || STATUS_LABELS.not_tested
              const supplier = b.supplier || 'unknown supplier'
              return (
                <option key={b.id} value={b.id}>{b.event_date} · {supplier} · {b.slats_received} slats received · [{status.label}]</option>
              )
            })}
          </select>
        )}
      </Field>

      {batch && (
        <div className="bg-amber-50 border border-amber-100 rounded p-3 space-y-1">
          <div className="text-xs font-medium text-amber-900">Recommended sample for this batch</div>
          <div className="text-sm text-amber-900">
            <strong>{recommended}</strong> slat{recommended === 1 ? '' : 's'} ({(0.05 * batch.slats_received).toFixed(1)} = 5% of {batch.slats_received} received, rounded up)
          </div>
          <div className="text-xs text-amber-800">
            Current status: <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_LABELS[batch.borax_test_status].color}`}>{STATUS_LABELS[batch.borax_test_status].label}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Passed (color changed)" required hint="Turmeric solution turned red on contact">
          <input type="number" inputMode="numeric" value={pass} onChange={e => setPass(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
        <Field label="Failed (no color change)" required hint="Solution stayed yellow, slat not treated">
          <input type="number" inputMode="numeric" value={fail} onChange={e => setFail(e.target.value)} placeholder="0" className={inputCls} />
        </Field>
      </div>

      {batchId && totalTested > 0 && (
        <div className={`text-xs rounded p-2 ${willFlag ? 'bg-red-50 text-red-800 border border-red-200' : willPass ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-700'}`}>
          {willFlag ? (
            <>Outcome: <strong>Flag for review</strong>. {f} slat(s) failed. Batch cannot be used downstream until Mark or Bryan reviews and approves.</>
          ) : (
            <>Outcome: <strong>Pass</strong>. All {p} tested slats showed the color change. Batch marked as passed.</>
          )}
          {batch && totalTested < recommended && (
            <div className="mt-1 text-amber-700">Note: you tested {totalTested}, less than the recommended {recommended}.</div>
          )}
        </div>
      )}

      <Field label="Notes (optional)"><textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} className={inputCls + ' resize-none'} placeholder="e.g. used fresh turmeric solution batch from today" /></Field>
      <ShiftOperator value={shiftOp} onChange={setShiftOp} />

      {msg && <div className={`text-sm rounded p-3 ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : msg.kind === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}

      <button onClick={submit} disabled={!isValid || busy} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed">{busy ? 'Saving.' : 'Save test result'}</button>
    </div>
  )
}
