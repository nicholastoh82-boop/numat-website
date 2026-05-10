'use client'
import { useEffect, useState } from 'react'
import type { Variant } from './ProductionShell'

type Station = 'slats' | 'planing' | 'gluing' | 'veneer_sanding' | 'boards'

const TABLE_BY_STATION: Record<Station, string> = {
  slats: 'prod_slat_receipts',
  planing: 'prod_planing_runs',
  gluing: 'prod_gluing_runs',
  veneer_sanding: 'prod_veneer_sanding',
  boards: 'prod_board_runs',
}

export default function RecentEntries({ station, refreshKey, userEmail, variants }: { station: Station; refreshKey: number; userEmail: string; variants: Variant[] }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const variantById = new Map(variants.map(v => [v.id, v]))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/production/list?station=${station}&limit=5`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(j => { if (!cancelled) setRows(j.rows || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [station, refreshKey])

  const voidEntry = async (id: string) => {
    const reason = window.prompt('Reason for voiding this entry?')
    if (!reason || !reason.trim()) return
    const res = await fetch(`/api/production/void`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: TABLE_BY_STATION[station], row_id: id, reason: reason.trim(), voided_by: userEmail }),
    })
    if (res.ok) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, voided: true, void_reason: reason.trim() } : r))
    } else {
      alert('Failed to void entry')
    }
  }

  if (loading) return <p className="text-xs text-gray-500">Loading recent entries.</p>
  if (rows.length === 0) return <p className="text-xs text-gray-500">No entries yet for this station.</p>

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent entries (last 5)</h3>
      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.id} className={`border rounded p-2.5 text-xs ${r.voided ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">
                  {r.event_date}
                  {r.voided && <span className="ml-2 px-1.5 py-0.5 rounded bg-red-200 text-red-800 text-[10px] font-semibold">VOIDED</span>}
                </div>
                <div className="text-gray-600 mt-0.5">{summarise(station, r, variantById)}</div>
                <div className="text-gray-400 mt-0.5">by <span className="font-mono">{r.submitted_by}</span> on {new Date(r.submitted_at).toLocaleString()}</div>
                {r.void_reason && <div className="text-red-700 mt-0.5">Voided: {r.void_reason}</div>}
              </div>
              {!r.voided && (
                <button onClick={() => voidEntry(r.id)} className="text-xs text-red-600 hover:text-red-800 shrink-0">Void</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">To correct an entry, void it and submit a new one. All changes are logged.</p>
    </div>
  )
}

function summarise(station: Station, r: any, variantById: Map<string, Variant>): string {
  if (station === 'slats') return `Supplier ${r.supplier || 'unknown'}: ${r.slats_received} received, ${r.slats_passed} passed, ${r.slats_rejected} rejected`
  if (station === 'planing') return `${r.slats_in} in, ${r.slats_out} survived, ${r.defects} defects, ${r.downtime_min}min downtime`
  if (station === 'gluing') return `${r.slats_consumed} slats → ${r.veneers_produced} veneers, ${r.downtime_min}min downtime`
  if (station === 'veneer_sanding') return `${r.veneers_in} sanded, ${r.veneers_passed} passed, ${r.defects} defects`
  if (station === 'boards') {
    const v = r.variant_id ? variantById.get(r.variant_id) : null
    const sku = v?.sku || r.sku_snapshot || 'unknown'
    return `${sku}: ${r.veneers_consumed} veneers → ${r.boards_passed} boards passed (${r.defects} defects)`
  }
  return ''
}
