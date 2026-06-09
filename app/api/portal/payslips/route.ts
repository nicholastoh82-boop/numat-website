/*
  app/api/portal/payslips/route.ts
  POST uploads a payslip for a staff member (admin only). DELETE removes one
  (admin only). Files go into the private payslips bucket via the service role.
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

export async function POST(req: NextRequest) {
  const me = await getPortalUser()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  if (!me.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const form = await req.formData()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const period = String(form.get('period') || '').trim()
  const file = form.get('file') as File | null
  if (!email || !period || !file) {
    return NextResponse.json({ error: 'Email, period, and a file are required.' }, { status: 400 })
  }

  const a = adminClient()

  // Resolve the staff member by email.
  const { data: list } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const target = list?.users?.find((u) => (u.email || '').toLowerCase() === email)
  if (!target) {
    return NextResponse.json({ error: 'No portal user has that email.' }, { status: 400 })
  }

  const safe = (file.name || 'payslip.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${target.id}/${Date.now()}_${safe}`
  const buf = Buffer.from(await file.arrayBuffer())

  const up = await a.storage
    .from('payslips')
    .upload(path, buf, { contentType: file.type || 'application/pdf', upsert: false })
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 })

  const { error } = await a.from('payslips').insert({
    user_id: target.id,
    user_email: target.email,
    period,
    file_path: path,
    file_name: file.name || safe,
    uploaded_by: me.id,
    uploaded_by_email: me.email,
  })
  if (error) {
    await a.storage.from('payslips').remove([path])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const me = await getPortalUser()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  if (!me.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const a = adminClient()
  const { data: row } = await a
    .from('payslips')
    .select('file_path')
    .eq('id', id)
    .maybeSingle()
  if (row?.file_path) await a.storage.from('payslips').remove([row.file_path])
  await a.from('payslips').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
