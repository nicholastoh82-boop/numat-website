'use client'
import { useEffect, useState } from 'react'
import type { Variant, InventoryRow } from './ProductionShell'

type Props = { refreshKey: number; variants: Variant[]; initial: InventoryRow[] }

export default function InventoryView({ refreshKey, variants, initial }: Props) {
  const [rows, setRows] = useState<InventoryRow[]>(initial)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/production/inventory', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { rows: [] })
      .then((j: { rows: InventoryRow[] }) => { if (!cancelled) setRows(j.rows || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  const slat = rows.find(r => r.product_type === 'slat')
  const veneer = rows.find(r => r.product_type === 'veneer')
  const boards = rows.filter(r => r.product_type === 'board')
  const variantById = new Map(variants.map(v => [v.id, v]))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Live inventory</h2>
        <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Refreshing.' : `Last updated: ${slat?.updated_at ? new Date(slat.updated_at).toLocaleString() : 'never'}`}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card label="Slats on hand" value={slat?.on_hand ?? 0} accent="amber" />
        <Card label="Veneers on hand" value={veneer?.on_hand ?? 0} accent="blue" />
        <Card label="Total boards" value={boards.reduce((s, r) => s + r.on_hand, 0)} accent="emerald" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Boards by SKU</h3>
        {boards.length === 0 ? (
          <p className="text-xs text-gray-500">No boards in stock yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="text-xs text-gray-500 border-b border-gray-200">
                <tr><th className="text-left py-2 px-3">SKU</th><th className="text-left py-2 px-3">Product</th><th className="text-right py-2 px-3">On hand</th></tr>
              </thead>
              <tbody>
                {boards.sort((a, b) => b.on_hand - a.on_hand).map(r => {
                  const v = r.variant_id ? variantById.get(r.variant_id) : null
                  return (
                    <tr key={r.variant_id || 'unknown'} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-mono text-xs">{v?.sku || r.variant_id || 'unknown'}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{v?.products?.name || ''} {v?.size_label ? `· ${v.size_label}` : ''}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">{r.on_hand}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, accent }: { label: string; value: number; accent: 'amber' | 'blue' | 'emerald' }) {
  const colors = { amber: 'bg-amber-50 border-amber-200 text-amber-900', blue: 'bg-blue-50 border-blue-200 text-blue-900', emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900' }[accent]
  return (
    <div className={`rounded-lg border p-4 ${colors}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value.toLocaleString()}</div>
    </div>
  )
}
