/*
  app/api/portal/push/pending/route.ts
  Called by the service worker when a wake signal arrives. Returns the latest
  unread notification for the signed in person and marks it read so it is not
  shown twice. Returns an empty object when there is nothing or no session.
*/

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({})

  const a = adminClient()
  const { data } = await a
    .from('push_notifications')
    .select('id, title, body, url')
    .eq('user_id', user.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  const row = (data ?? [])[0] as
    | { id: string; title: string; body: string | null; url: string | null }
    | undefined
  if (!row) return NextResponse.json({})

  await a.from('push_notifications').update({ read_at: new Date().toISOString() }).eq('id', row.id)

  return NextResponse.json({ title: row.title, body: row.body, url: row.url })
}
