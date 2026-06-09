/*
  app/api/portal/documents/route.ts
  POST uploads a document (admin only). DELETE removes one (admin only). Files
  go into the private documents bucket via the service role.
*/

import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CATEGORIES = new Set(['SOP', 'Role manual', 'Safety data sheet', 'Certification', 'Other'])

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
  let category = String(form.get('category') || 'Other').trim()
  if (!CATEGORIES.has(category)) category = 'Other'
  const title = String(form.get('title') || '').trim().slice(0, 200)
  const notes = String(form.get('notes') || '').trim().slice(0, 1000) || null
  const file = form.get('file') as File | null
  if (!title || !file) {
    return NextResponse.json({ error: 'A title and a file are required.' }, { status: 400 })
  }

  const a = adminClient()
  const safe = (file.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder = category.replace(/[^a-zA-Z0-9]/g, '_')
  const path = `${folder}/${Date.now()}_${safe}`
  const buf = Buffer.from(await file.arrayBuffer())

  const up = await a.storage
    .from('documents')
    .upload(path, buf, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 })

  const { error } = await a.from('documents').insert({
    category,
    title,
    notes,
    file_path: path,
    file_name: file.name || safe,
    uploaded_by: me.id,
    uploaded_by_email: me.email,
  })
  if (error) {
    await a.storage.from('documents').remove([path])
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
  const { data: row } = await a.from('documents').select('file_path').eq('id', id).maybeSingle()
  if (row?.file_path) await a.storage.from('documents').remove([row.file_path])
  await a.from('documents').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
