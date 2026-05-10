'use client'

import { useState } from 'react'
import SlatReceiptForm from './SlatReceiptForm'
import PlaningForm from './PlaningForm'
import GluingForm from './GluingForm'
import VeneerSandingForm from './VeneerSandingForm'
import BoardRunForm from './BoardRunForm'
import InventoryView from './InventoryView'
import RecentEntries from './RecentEntries'
import AuditLogView from './AuditLogView'

export type Variant = {
  id: string
  sku: string
  thickness_mm: number | null
  size_label: string | null
  ply_count: number | null
  products: { name: string } | null
}

export type InventoryRow = {
  product_type: 'slat' | 'veneer' | 'board'
  variant_id: string | null
  on_hand: number
  updated_at: string
}

type Tab = 'slats' | 'planing' | 'gluing' | 'veneer_sanding' | 'boards' | 'inventory' | 'audit'

const TABS: { key: Tab; label: string; subtitle: string }[] = [
  { key: 'slats', label: 'Slats In', subtitle: 'Supplier delivery + QA' },
  { key: 'planing', label: 'Planing', subtitle: 'Rough + fine planer' },
  { key: 'gluing', label: 'Gluing', subtitle: '1st heat press → veneers' },
  { key: 'veneer_sanding', label: 'Veneer Sand', subtitle: 'Veneer sanding QA' },
  { key: 'boards', label: 'Boards', subtitle: '2nd press → finished boards' },
  { key: 'inventory', label: 'Inventory', subtitle: 'Live stock counters' },
  { key: 'audit', label: 'Activity Log', subtitle: 'Who changed what' },
]

type Props = {
  userEmail: string
  variants: Variant[]
  initialInventory: InventoryRow[]
}

export default function ProductionShell({ userEmail, variants, initialInventory }: Props) {
  const [tab, setTab] = useState<Tab>('slats')
  const [inventory, setInventory] = useState<InventoryRow[]>(initialInventory)
  const [refreshKey, setRefreshKey] = useState(0)

  const onSubmit = () => {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Production</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Daily station entries. Logged in as <span className="font-mono">{userEmail}</span>.
        </p>
      </div>

      {/* Tab nav: horizontally scrollable on mobile */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm whitespace-nowrap shrink-0 border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-gray-900 text-gray-900 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
        {tab === 'slats' && <SlatReceiptForm userEmail={userEmail} onSubmitted={onSubmit} />}
        {tab === 'planing' && <PlaningForm userEmail={userEmail} onSubmitted={onSubmit} />}
        {tab === 'gluing' && <GluingForm userEmail={userEmail} onSubmitted={onSubmit} />}
        {tab === 'veneer_sanding' && <VeneerSandingForm userEmail={userEmail} onSubmitted={onSubmit} />}
        {tab === 'boards' && <BoardRunForm userEmail={userEmail} variants={variants} onSubmitted={onSubmit} />}
        {tab === 'inventory' && <InventoryView refreshKey={refreshKey} variants={variants} initial={inventory} />}
        {tab === 'audit' && <AuditLogView refreshKey={refreshKey} />}
      </div>

      {/* Recent entries always visible below */}
      {(tab !== 'inventory' && tab !== 'audit') && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <RecentEntries station={tab} refreshKey={refreshKey} userEmail={userEmail} variants={variants} />
        </div>
      )}
    </div>
  )
}
