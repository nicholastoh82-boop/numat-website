/* app/portal/(authed)/buying/page.tsx
   Buying. Suppliers and purchase orders. Gated by the buying feature. */

import { requireFeature } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'
import {
  SupplierAdd,
  SupplierDelete,
  OrderCreate,
  OrderStatus,
  OrderDelete,
} from '@/components/portal/buying-tools'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Buying | NUMAT Portal',
  robots: 'noindex, nofollow',
}

type Supplier = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
}

type Order = {
  id: string
  supplier_name: string | null
  reference: string | null
  status: string
  order_date: string | null
  expected_date: string | null
  currency: string
  total: number
  items: { description: string; qty: number; unit_price: number }[] | null
  notes: string | null
}

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  ordered: 'Ordered',
  received: 'Received',
}

export default async function BuyingPage() {
  await requireFeature('buying')
  const a = adminClient()

  const { data: supData } = await a
    .from('suppliers')
    .select('id, name, contact_name, email, phone')
    .order('name', { ascending: true })
  const suppliers = (supData ?? []) as Supplier[]

  const { data: orderData } = await a
    .from('purchase_orders')
    .select('id, supplier_name, reference, status, order_date, expected_date, currency, total, items, notes')
    .order('created_at', { ascending: false })
    .limit(200)
  const orders = (orderData ?? []) as Order[]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Buying</h1>
        <p className="text-sm text-gray-600">Suppliers and purchase orders.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Purchase orders
        </h2>
        <OrderCreate suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} />
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">No purchase orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      {o.supplier_name || 'No supplier'}
                      {o.reference ? <span className="ml-2 font-normal text-gray-500">{o.reference}</span> : null}
                    </div>
                    <div className="text-gray-500">
                      {o.currency} {Number(o.total).toLocaleString()} | {o.items?.length || 0} items
                    </div>
                    <div className="text-gray-400">
                      {o.order_date ? `Ordered ${o.order_date}` : 'No order date'}
                      {o.expected_date ? ` | expected ${o.expected_date}` : ''}
                    </div>
                    {o.notes && <div className="mt-1 text-gray-500">{o.notes}</div>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <OrderStatus id={o.id} status={o.status} />
                    <OrderDelete id={o.id} />
                  </div>
                </div>
                {o.items && o.items.length > 0 && (
                  <div className="mt-2 border-t border-gray-100 pt-2 text-gray-500">
                    {o.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span className="truncate">{it.description || 'Item'}</span>
                        <span className="shrink-0">
                          {it.qty} x {it.unit_price}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="sr-only">{STATUS_LABEL[o.status]}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Suppliers</h2>
        <SupplierAdd />
        {suppliers.length === 0 ? (
          <p className="text-sm text-gray-500">No suppliers yet.</p>
        ) : (
          <div className="space-y-2">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{s.name}</div>
                  <div className="truncate text-gray-500">
                    {[s.contact_name, s.email, s.phone].filter(Boolean).join(' | ') || 'No contact details'}
                  </div>
                </div>
                <SupplierDelete id={s.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
