/* app/api/portal/push/mention-hook/route.ts
   Called by the database the moment a Team Chat mention is created (a message in
   a private chat, or an @tag in a public channel). It sends a push to the person
   mentioned. Not a user route: it is called server to server by the database and
   is protected by a shared secret held in push_config. */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { notifyUsers } from '@/lib/portal/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const a = adminClient()

  const { data: cfg } = await a
    .from('push_config')
    .select('value')
    .eq('key', 'hook_secret')
    .maybeSingle()
  const secret = (cfg as { value?: string } | null)?.value || ''
  if (!secret || req.headers.get('x-hook-secret') !== secret) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { mention_id } = await req.json().catch(() => ({}))
  if (!mention_id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { data: m } = await a
    .from('team_mentions')
    .select('mentioned_user_id, author_name, body_preview')
    .eq('id', mention_id)
    .maybeSingle()
  const row = m as
    | { mentioned_user_id: string; author_name: string | null; body_preview: string | null }
    | null
  if (!row) return NextResponse.json({ ok: true, skipped: 'not found' })

  await notifyUsers({
    userIds: [row.mentioned_user_id],
    title: row.author_name || 'New message',
    body: row.body_preview || 'New message in Team Chat',
    url: '/portal/chat',
  })

  return NextResponse.json({ ok: true })
}
