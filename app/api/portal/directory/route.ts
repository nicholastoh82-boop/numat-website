/*
  app/api/portal/directory/route.ts
  POST lets the signed in person set their own job title and phone for the
  staff directory. Writes use the service role and only touch their own row.
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

function clean(v: unknown, max: number): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  return s.slice(0, max)
}

export async function POST(req: NextRequest) {
  const me = await getPortalUser()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json()
  const title = clean(body?.title, 120)
  const phone = clean(body?.phone, 40)

  const a = adminClient()
  const { error } = await a
    .from('staff_profiles')
    .upsert(
      { user_id: me.id, title, phone, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
