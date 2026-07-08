'use client'
import { useEffect, useState } from 'react'

type AuditRow = {
  id: string
  table_name: string
  row_id: string
  action: 'insert' | 'update' | 'void'
  old_values: any
  new_values: any
  changed_by: string
  changed_at: string
}

const TABLE_LABELS: Record<string, string> = {
  prod_slat_receipts: 'Slats In',
  prod_planing_runs: 'Planing',
  prod_gluing_runs: 'Gluing',
  prod_veneer_sanding: 'Veneer Sand',
  prod_board_runs: 'Boards',
  prod_borax_tests: 'Borax Test',
}

export default function AuditLogView({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/production/audit-log', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(j => { if (!cancelled) setRows(j.rows || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  if (loading) return <p className="text-sm text-gray-500">Loading.</p>
  if (rows.length === 0) return <p className="text-sm text-gray-500">No production activity yet.</p>

  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-gray-900">Activity log</h2>
      <p className="text-xs text-gray-500">Last 100 changes across all stations.</p>
      <div className="space-y-1.5 mt-3">
        {rows.map(r => {
          const station = TABLE_LABELS[r.table_name] || r.table_name
          const actionColor = r.action === 'void' ? 'bg-red-100 text-red-700' : r.action === 'update' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          const summary = summarise(r)
          return (
            <div key={r.id} className="border border-gray-200 rounded p-2.5 text-xs flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${actionColor}`}>{r.action.toUpperCase()}</span>
                  <span className="font-medium text-gray-900">{station}</span>
                  <span className="text-gray-500">by <span className="font-mono">{r.changed_by}</span></span>
                </div>
                <div className="text-gray-600 mt-1">{summary}</div>
              </div>
              <div className="text-gray-400 shrink-0">{new Date(r.changed_at).toLocaleString()}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function summarise(r: AuditRow): string {
  const v = r.new_values || r.old_values || {}
  const date = v.event_date || ''
  const t = r.table_name
  if (t === 'prod_slat_receipts') return `${date}: ${v.slats_received || 0} received, ${v.slats_passed || 0} passed`
  if (t === 'prod_planing_runs') return `${date}: ${v.slats_in || 0} in, ${v.slats_out || 0} out, ${v.defects || 0} defects`
  if (t === 'prod_gluing_runs') return `${date}: ${v.slats_consumed || 0} slats → ${v.veneers_produced || 0} veneers`
  if (t === 'prod_veneer_sanding') return `${date}: ${v.veneers_in || 0} sanded, ${v.veneers_passed || 0} passed`
  if (t === 'prod_borax_tests') return `${date}: tested ${((v.slats_pass || 0) + (v.slats_fail || 0))}, fails: ${v.slats_fail || 0}`
  if (t === 'prod_board_runs') return `${date}: ${v.sku_snapshot || ''} · ${v.veneers_consumed || 0} veneers → ${v.boards_passed || 0} boards`
  return `${date}: ${r.row_id}`
}
