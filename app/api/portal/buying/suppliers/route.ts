/*
  app/api/portal/buying/suppliers/route.ts
  POST adds a supplier, DELETE removes one. Allowed for admins or anyone with
  the buying function. Writes use the service role.
*/

import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

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

function clean(v: unknown, max: number): string | null {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : null
}

export async function POST(req: NextRequest) {
  const me = await gate()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json()
  const name = clean(body?.name, 160)
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const a = adminClient()
  const { error } = await a.from('suppliers').insert({
    name,
    contact_name: clean(body?.contact_name, 120),
    email: clean(body?.email, 160),
    phone: clean(body?.phone, 60),
    address: clean(body?.address, 400),
    notes: clean(body?.notes, 1000),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const me = await gate()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const a = adminClient()
  await a.from('suppliers').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
