/* app/api/portal/push/chat-hook/route.ts
   Called by the database the moment a Team Chat message is created. It sends a
   push to every other member of that channel, so no message is missed. Not a
   user route: it is called server to server by the database and is protected by
   a shared secret held in push_config. */

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

  const { message_id } = await req.json().catch(() => ({}))
  if (!message_id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { data: msg } = await a
    .from('team_messages')
    .select('id, channel_id, sender_id, sender_name, sender_email, body, deleted_at')
    .eq('id', message_id)
    .maybeSingle()
  const m = msg as
    | {
        id: string
        channel_id: string
        sender_id: string
        sender_name: string | null
        sender_email: string | null
        body: string | null
        deleted_at: string | null
      }
    | null
  if (!m || m.deleted_at) return NextResponse.json({ ok: true, skipped: true })

  const { data: mem } = await a
    .from('team_channel_members')
    .select('user_id')
    .eq('channel_id', m.channel_id)
    .neq('user_id', m.sender_id)
  const recipients = ((mem ?? []) as { user_id: string }[]).map((r) => r.user_id)
  if (recipients.length === 0) return NextResponse.json({ ok: true, recipients: 0 })

  const sender = m.sender_name || (m.sender_email ? m.sender_email.split('@')[0] : 'New message')
  const preview = (m.body || '').trim()
  const body = preview ? preview.slice(0, 140) : 'Sent a message'

  await notifyUsers({ userIds: recipients, title: sender, body, url: '/portal/chat' })
  return NextResponse.json({ ok: true, recipients: recipients.length })
}
