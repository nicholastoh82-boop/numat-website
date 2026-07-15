/* app/portal/(authed)/orders/page.tsx
   Orders and delivery. Reads the live outstanding orders view, which is built
   from master orders and the delivery invoices raised against them. This shows
   how much of each order is delivered and how much is still to go, drawn from
   the real data so it can never disagree with the CRM. Gated by the orders
   feature. */

import { requireFeature } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Orders | NUMAT Portal',
  robots: 'noindex, nofollow',
}

type Row = {
  master_quote_id: string
  master_invoice_number: string | null
  customer_name: string | null
  currency: string | null
  qty_ordered: number | null
  quantity_unit: string | null
  contract_value: number | null
  qty_delivered: number | null
  qty_remaining: number | null
  delivered_value: number | null
  remaining_value: number | null
  deposit_on_file: number | null
}

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function money(currency: string | null, n: number | null): string {
  return `${currency || ''} ${Number(n || 0).toLocaleString()}`.trim()
}

function qty(n: number | null, unit: string | null): string {
  return `${Number(n || 0).toLocaleString()}${unit ? ` ${unit}` : ''}`
}

export default async function OrdersPage() {
  await requireFeature('orders')
  const a = adminClient()

  const { data } = await a
    .from('v_outstanding_orders')
    .select(
      'master_quote_id, master_invoice_number, customer_name, currency, qty_ordered, quantity_unit, contract_value, qty_delivered, qty_remaining, delivered_value, remaining_value, deposit_on_file',
    )
    .order('master_created_at', { ascending: false })
  const rows = (data ?? []) as Row[]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Orders and delivery</h1>
        <p className="text-sm text-gray-600">
          Live from your invoices. Raise a delivery invoice against an order in the CRM and it
          updates here.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No open orders.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const ordered = Number(r.qty_ordered || 0)
            const delivered = Number(r.qty_delivered || 0)
            const remaining = Number(r.qty_remaining || 0)
            const pct = ordered > 0 ? Math.min(100, Math.round((delivered / ordered) * 100)) : 0
            const done = remaining <= 0 && ordered > 0
            return (
              <div key={r.master_quote_id} className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      {r.customer_name || 'Customer'}
                      {r.master_invoice_number ? (
                        <span className="ml-2 font-normal text-gray-500">{r.master_invoice_number}</span>
                      ) : null}
                    </div>
                    <div className="text-gray-500">Contract {money(r.currency, r.contract_value)}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      done ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {done ? 'Delivered' : 'Open'}
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>
                      Delivered {qty(delivered, r.quantity_unit)} of {qty(ordered, r.quantity_unit)}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
                    <div className="h-full rounded bg-green-600" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-500">
                    Remaining {qty(remaining, r.quantity_unit)} | {money(r.currency, r.remaining_value)} left
                    to invoice
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-100 pt-2 text-xs text-gray-500">
                  <span>Delivered value {money(r.currency, r.delivered_value)}</span>
                  <span>Deposit on file {money(r.currency, r.deposit_on_file)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
