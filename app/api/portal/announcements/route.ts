/*
  app/api/portal/announcements/route.ts

  POST creates an announcement, DELETE removes one. Both are admin only and
  use the service role, mirroring the access route. Reading is done by the
  page itself, so there is no GET here.
*/

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { notifyUsers } from '@/lib/portal/push'

export const runtime = 'nodejs'

const ALWAYS_ADMIN = ['nick@numat.ph']

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function callerIfAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const email = (user.email || '').toLowerCase()
  if (ALWAYS_ADMIN.includes(email)) return user
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
  if (data && data.length > 0) return user
  return null
}

export async function POST(req: NextRequest) {
  const caller = await callerIfAdmin()
  if (!caller) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { title, body, pinned } = await req.json()
  const t = typeof title === 'string' ? title.trim() : ''
  const b = typeof body === 'string' ? body.trim() : ''
  if (!t || !b) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
  }

  const a = adminClient()
  const { error } = await a.from('announcements').insert({
    title: t,
    body: b,
    pinned: pinned === true,
    created_by: caller.id,
    created_by_email: caller.email || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await notifyUsers({
      userIds: null,
      title: 'New announcement',
      body: t,
      url: '/portal/announcements',
    })
  } catch {
    // Push is best effort and never blocks posting.
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const caller = await callerIfAdmin()
  if (!caller) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { id } = await req.json()
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const a = adminClient()
  const { error } = await a.from('announcements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
