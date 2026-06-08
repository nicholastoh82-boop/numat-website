/**
 * Mention email cron
 *
 * Runs every 5 minutes. Emails anyone tagged in Team Chat whose mention is
 * still unread (so people who already saw the red dot are not emailed). The in
 * app red dot is instant via a database trigger; this is the away fallback.
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

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: pending, error } = await sb
    .from('team_mentions')
    .select('id, mentioned_user_id, channel_id, author_name, body_preview')
    .is('emailed_at', null)
    .is('read_at', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pending || pending.length === 0) return NextResponse.json({ ok: true, sent: 0, skipped: 0 })

  const channelIds = Array.from(new Set(pending.map((p) => p.channel_id)))
  const { data: chans } = await sb.from('team_channels').select('id, name').in('id', channelIds)
  const channelName = new Map<string, string>()
  for (const c of (chans || []) as { id: string; name: string }[]) channelName.set(c.id, c.name)

  const userIds = Array.from(new Set(pending.map((p) => p.mentioned_user_id)))
  const emailById = new Map<string, string>()
  for (const id of userIds) {
    try {
      const { data } = await sb.auth.admin.getUserById(id)
      const email = data?.user?.email || ''
      if (email) emailById.set(id, email)
    } catch {
      // skip this recipient
    }
  }

  let sent = 0
  let skipped = 0
  for (const m of pending) {
    const to = emailById.get(m.mentioned_user_id) || ''
    if (!to || !to.toLowerCase().endsWith('@numat.ph')) {
      await sb.from('team_mentions').update({ emailed_at: new Date().toISOString() }).eq('id', m.id)
      skipped += 1
      continue
    }
    const author = m.author_name || 'Someone'
    const room = channelName.get(m.channel_id) || ''
    const preview = esc(m.body_preview || '')
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#111827;padding:16px;max-width:560px">
  <p style="font-size:15px;margin:0 0 8px">${esc(author)} mentioned you in NUMAT Team Chat.</p>
  ${room ? `<p style="font-size:13px;color:#6b7280;margin:0 0 8px">Room: ${esc(room)}</p>` : ''}
  <blockquote style="margin:0 0 16px;padding:10px 12px;background:#f9fafb;border-left:3px solid #111827;font-size:14px;color:#374151">${preview}</blockquote>
  <a href="${APP_URL}/portal/chat" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;padding:9px 16px;border-radius:6px">Open Team Chat</a>
</div>`
    try {
      await sendNotificationEmail({ to, subject: `${author} mentioned you in Team Chat`, html })
      await sb.from('team_mentions').update({ emailed_at: new Date().toISOString() }).eq('id', m.id)
      sent += 1
    } catch (e) {
      console.error('mention email failed', m.id, e)
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
