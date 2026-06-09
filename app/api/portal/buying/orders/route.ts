/*
  app/api/portal/buying/orders/route.ts
  POST creates a purchase order with line items, PATCH changes its status,
  DELETE removes it. Allowed for admins or anyone with the buying function.
  The total is computed on the server from the line items.
*/

import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const STATUSES = new Set(['draft', 'ordered', 'received'])

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function gate() {
  const me = await getPortalUser()
  if (!me) return null
  if (!me.isAdmin && !me.features.includes('buying')) return null
  return me
}

function num(v: unknown): number {
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : 0
}

function cleanItems(input: unknown): { description: string; qty: number; unit_price: number }[] {
  if (!Array.isArray(input)) return []
  return input
    .map((it) => ({
      description: String((it as { description?: unknown })?.description ?? '').trim().slice(0, 200),
      qty: num((it as { qty?: unknown })?.qty),
      unit_price: num((it as { unit_price?: unknown })?.unit_price),
    }))
    .filter((it) => it.description || it.qty || it.unit_price)
}

export async function POST(req: NextRequest) {
  const me = await gate()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json()
  const items = cleanItems(body?.items)
  if (items.length === 0) {
    return NextResponse.json({ error: 'Add at least one line item.' }, { status: 400 })
  }
  const total = items.reduce((sum, it) => sum + it.qty * it.unit_price, 0)

  const a = adminClient()

  let supplierName: string | null = null
  const supplierId = body?.supplier_id || null
  if (supplierId) {
    const { data: sup } = await a.from('suppliers').select('name').eq('id', supplierId).maybeSingle()
    supplierName = (sup as { name?: string } | null)?.name ?? null
  }

  const orderDate = body?.order_date || null
  const expectedDate = body?.expected_date || null
  const currency = String(body?.currency || 'PHP').trim().slice(0, 8) || 'PHP'
  const reference = String(body?.reference || '').trim().slice(0, 80) || null
  const notes = String(body?.notes || '').trim().slice(0, 1000) || null

  const { error } = await a.from('purchase_orders').insert({
    supplier_id: supplierId,
    supplier_name: supplierName,
    reference,
    status: 'draft',
    order_date: orderDate,
    expected_date: expectedDate,
    currency,
    items,
    total,
    notes,
    created_by: me.id,
    created_by_email: me.email,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const me = await gate()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const { id, status } = await req.json()
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const a = adminClient()
  const { error } = await a.from('purchase_orders').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const me = await gate()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const a = adminClient()
  await a.from('purchase_orders').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
