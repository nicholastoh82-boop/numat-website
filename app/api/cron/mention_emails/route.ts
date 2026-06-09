/**
 * Notification email cron
 *
 * Runs every 5 minutes. Emails anyone with unread Team Chat notifications
 * (a message in a private room, or an @tag in a public channel). One email per
 * person, listing what is waiting, so a busy room does not flood them. People
 * who already opened Notifications (marked read) are not emailed.
 *
 * Auth: Bearer ${CRON_SECRET} header, set automatically by Vercel cron.
 * Manual: curl -H "Authorization: Bearer $CRON_SECRET" https://numatbamboo.com/api/cron/mention_emails
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendNotificationEmail } from '@/lib/sendgrid'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.PORTAL_BASE_URL || 'https://numatbamboo.com'

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

type Row = {
  id: string
  mentioned_user_id: string
  channel_id: string
  author_name: string | null
  body_preview: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Turn tasks whose due time has passed into notifications for everyone in
  // that chat. These flow through the same unread dot and email below.
  try {
    const nowIso = new Date().toISOString()
    const { data: dueTasks } = await sb
      .from('team_action_items')
      .select('id, channel_id, title')
      .lte('due_at', nowIso)
      .is('reminded_at', null)
      .neq('status', 'done')
      .limit(100)
    for (const t of (dueTasks || []) as { id: string; channel_id: string; title: string }[]) {
      const { data: mem } = await sb
        .from('team_channel_members')
        .select('user_id')
        .eq('channel_id', t.channel_id)
      const reminderRows = ((mem || []) as { user_id: string }[]).map((m) => ({
        channel_id: t.channel_id,
        message_id: null,
        mentioned_user_id: m.user_id,
        author_name: 'Task reminder',
        body_preview: (t.title || '').slice(0, 200),
      }))
      if (reminderRows.length > 0) {
        await sb.from('team_mentions').insert(reminderRows)
      }
      await sb.from('team_action_items').update({ reminded_at: nowIso }).eq('id', t.id)
    }
  } catch (e) {
    console.error('task reminder generation failed', e)
  }

  const { data: pending, error } = await sb
    .from('team_mentions')
    .select('id, mentioned_user_id, channel_id, author_name, body_preview, created_at')
    .is('emailed_at', null)
    .is('read_at', null)
    .order('created_at', { ascending: true })
    .limit(300)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pending || pending.length === 0) return NextResponse.json({ ok: true, emails: 0, items: 0 })

  const rows = pending as Row[]

  const channelIds = Array.from(new Set(rows.map((r) => r.channel_id)))
  const { data: chans } = await sb.from('team_channels').select('id, name').in('id', channelIds)
  const channelName = new Map<string, string>()
  for (const c of (chans || []) as { id: string; name: string }[]) channelName.set(c.id, c.name)

  // group by recipient so each person gets one email
  const byUser = new Map<string, Row[]>()
  for (const r of rows) {
    const arr = byUser.get(r.mentioned_user_id) || []
    arr.push(r)
    byUser.set(r.mentioned_user_id, arr)
  }

  let emails = 0
  let items = 0
  for (const [uid, list] of byUser) {
    let to = ''
    try {
      const { data } = await sb.auth.admin.getUserById(uid)
      to = data?.user?.email || ''
    } catch {
      to = ''
    }
    const ids = list.map((r) => r.id)
    if (!to || !to.toLowerCase().endsWith('@numat.ph')) {
      await sb.from('team_mentions').update({ emailed_at: new Date().toISOString() }).in('id', ids)
      continue
    }

    const shown = list.slice(-8).reverse() // newest first, cap 8
    const more = list.length - shown.length
    const lines = shown
      .map((r) => {
        const who = esc(r.author_name || 'Someone')
        const room = esc(channelName.get(r.channel_id) || 'Team Chat')
        const prev = esc(r.body_preview || '')
        return `<div style="margin:0 0 10px">
  <div style="font-size:13px;color:#111827"><strong>${who}</strong> <span style="color:#6b7280">in ${room}</span></div>
  <div style="font-size:13px;color:#374151">${prev}</div>
</div>`
      })
      .join('')
    const moreLine = more > 0 ? `<div style="font-size:12px;color:#6b7280;margin:0 0 10px">and ${more} more</div>` : ''
    const count = list.length
    const noun = count === 1 ? 'message' : 'messages'
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#111827;padding:16px;max-width:560px">
  <p style="font-size:15px;margin:0 0 12px">You have ${count} new ${noun} in NUMAT Team Chat.</p>
  ${lines}
  ${moreLine}
  <a href="${APP_URL}/portal/chat" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;padding:9px 16px;border-radius:6px;margin-top:6px">Open Team Chat</a>
</div>`
    try {
      await sendNotificationEmail({ to, subject: `You have ${count} new ${noun} in Team Chat`, html })
      await sb.from('team_mentions').update({ emailed_at: new Date().toISOString() }).in('id', ids)
      emails += 1
      items += list.length
    } catch (e) {
      console.error('notification email failed for', uid, e)
    }
  }

  return NextResponse.json({ ok: true, emails, items })
}
