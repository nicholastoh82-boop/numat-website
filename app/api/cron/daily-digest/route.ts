/**
 * Daily Digest Cron
 *
 * Runs at 00:00 MYT every day (16:00 UTC).
 * Fetches pending personal_tasks plus unreplied Gmail threads from the last 7 days,
 * and pushes a combined summary to Nick's Telegram bot.
 *
 * Auth: Bearer ${CRON_SECRET} header, set automatically by Vercel cron.
 *
 * Manual trigger for testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://numatbamboo.com/api/cron/daily-digest
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!
const CRON_SECRET = process.env.CRON_SECRET!
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const REP_EMAIL = 'nick@numat.ph'
const GMAIL_LOOKBACK_DAYS = 7
const MAX_THREADS_TO_INSPECT = 40
const MAX_THREADS_IN_DIGEST = 20

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: tasks, error: tasksErr } = await sb
      .from('personal_tasks')
      .select('id, task_text, status, snoozed_until, created_at')
      .in('status', ['pending', 'snoozed'])
      .order('created_at', { ascending: true })

    if (tasksErr) throw new Error(`Supabase tasks query failed: ${tasksErr.message}`)

    let unreplied: UnrepliedThread[] = []
    let gmailError: string | null = null
    try {
      unreplied = await getUnrepliedThreads()
    } catch (err: any) {
      gmailError = err.message ?? String(err)
      console.error('Gmail fetch failed:', gmailError)
    }

    const message = buildMessage(tasks ?? [], unreplied, gmailError)
    await sendTelegram(message)

    return NextResponse.json({
      ok: true,
      tasksCount: tasks?.length ?? 0,
      unrepliedCount: unreplied.length,
      gmailError,
      durationMs: Date.now() - startedAt,
    })
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    console.error('daily-digest failed:', msg)
    try {
      await sendTelegram(`Daily digest failed: ${msg}`)
    } catch {}
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function getAccessToken(): Promise<string> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: token, error } = await sb
    .from('rep_gmail_tokens')
    .select('refresh_token')
    .eq('rep_email', REP_EMAIL)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(`Token lookup failed: ${error.message}`)
  if (!token?.refresh_token) throw new Error(`No active Gmail refresh token for ${REP_EMAIL}`)

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const json: any = await resp.json()
  if (!resp.ok || !json.access_token) {
    throw new Error(`OAuth refresh failed: ${json.error || resp.status}`)
  }
  return json.access_token as string
}

interface UnrepliedThread {
  threadId: string
  subject: string
  fromName: string
  fromEmail: string
  receivedAt: number
}

async function getUnrepliedThreads(): Promise<UnrepliedThread[]> {
  const accessToken = await getAccessToken()

  const queryParts = [
    `to:me`,
    `newer_than:${GMAIL_LOOKBACK_DAYS}d`,
    `in:inbox`,
    `-from:${REP_EMAIL}`,
    `-from:noreply`,
    `-from:no-reply`,
    `-category:promotions`,
    `-category:social`,
    `-category:updates`,
    `-from:linkedin.com`,
    `-from:notifications@calendly.com`,
    `-from:booking@traveloka.com`,
    `-from:invoice+statements@mail.anthropic.com`,
    `-subject:"Unmatched reply"`,
    `-subject:"Automatic reply"`,
    `-subject:"Out of Office"`,
  ]
  const q = encodeURIComponent(queryParts.join(' '))
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${q}&maxResults=${MAX_THREADS_TO_INSPECT}`

  const listResp = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!listResp.ok) {
    const body = await listResp.text()
    throw new Error(`Gmail list failed: ${listResp.status} ${body.slice(0, 200)}`)
  }
  const listJson: any = await listResp.json()
  if (!listJson.threads) return []

  const out: UnrepliedThread[] = []

  for (const t of listJson.threads as Array<{ id: string }>) {
    try {
      const detailResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!detailResp.ok) continue
      const detail: any = await detailResp.json()
      if (!detail.messages || detail.messages.length === 0) continue

      const last = detail.messages[detail.messages.length - 1]
      const headers: Array<{ name: string; value: string }> = last.payload?.headers || []
      const fromHeader = headers.find(h => h.name === 'From')?.value || ''
      const subjectHeader = headers.find(h => h.name === 'Subject')?.value || '(no subject)'

      if (fromHeader.toLowerCase().includes(REP_EMAIL.toLowerCase())) continue

      const fromMatch = fromHeader.match(/^(.*?)\s*<(.+?)>$/)
      const fromName = (fromMatch?.[1] || fromHeader).replace(/"/g, '').trim() || fromHeader
      const fromEmail = fromMatch?.[2] || ''

      out.push({
        threadId: t.id,
        subject: subjectHeader.replace(/^Re:\s*/i, '').replace(/^Fwd?:\s*/i, '').slice(0, 90),
        fromName: fromName.slice(0, 40),
        fromEmail,
        receivedAt: parseInt(last.internalDate, 10) || 0,
      })

      if (out.length >= MAX_THREADS_IN_DIGEST) break
    } catch {
      continue
    }
  }

  out.sort((a, b) => b.receivedAt - a.receivedAt)
  return out
}

function escapeMarkdown(s: string): string {
  return s.replace(/([_*\[\]`])/g, '\\$1')
}

function buildMessage(
  tasks: Array<{ id: string; task_text: string; status: string; snoozed_until: string | null }>,
  unreplied: UnrepliedThread[],
  gmailError: string | null
): string {
  const today = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  let msg = `*Daily Digest, ${today}*\n\n`

  if (tasks.length === 0 && unreplied.length === 0 && !gmailError) {
    return msg + '_No pending tasks, no unreplied emails. Clean slate._'
  }

  if (tasks.length > 0) {
    msg += `*Pending Tasks (${tasks.length})*\n`
    tasks.forEach((t, i) => {
      const firstLine = t.task_text.split('\n')[0].slice(0, 110)
      const tag = t.status === 'snoozed' ? ' (snoozed)' : ''
      msg += `${i + 1}. ${escapeMarkdown(firstLine)}${tag}\n`
    })
    msg += `\nUse /list for details, /done N to clear, /snooze N 1d to defer.\n\n`
  }

  if (unreplied.length > 0) {
    msg += `*Unreplied Emails (${unreplied.length})*\n`
    unreplied.forEach((t, i) => {
      const line = `${t.fromName}: ${t.subject}`.slice(0, 130)
      msg += `${i + 1}. ${escapeMarkdown(line)}\n`
    })
    msg += '\n'
  } else if (gmailError) {
    msg += `_Gmail scan skipped: ${escapeMarkdown(gmailError.slice(0, 120))}_\n`
  }

  if (msg.length > 3900) msg = msg.slice(0, 3850) + '\n_(truncated)_'
  return msg
}

async function sendTelegram(text: string): Promise<void> {
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    console.error(`Telegram send failed: ${resp.status} ${body.slice(0, 200)}`)
  }
}
