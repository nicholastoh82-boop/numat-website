/**
 * Daily Digest Cron
 *
 * Runs at 00:00 MYT every day (16:00 UTC).
 * Inserts unreplied Gmail threads as tasks in personal_tasks (deduped via
 * [gmail:THREAD_ID] marker), then pushes a combined task summary to Telegram.
 *
 * Auth: Bearer ${CRON_SECRET} header, set automatically by Vercel cron.
 *
 * Manual trigger:
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
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  let unreplied: UnrepliedThread[] = []
  let gmailError: string | null = null
  let inserted = 0
  let existingCount = 0

  try {
    try {
      unreplied = await getUnrepliedThreads()
      const result = await upsertEmailTasks(sb, unreplied)
      inserted = result.inserted
      existingCount = result.existing
    } catch (err: any) {
      gmailError = err?.message ?? String(err)
      console.error('Gmail fetch or upsert failed:', gmailError)
    }

    const { data: tasks, error: tasksErr } = await sb
      .from('personal_tasks')
      .select('id, task_text, status, source, snoozed_until, created_at')
      .in('status', ['pending', 'snoozed'])
      .order('created_at', { ascending: true })

    if (tasksErr) throw new Error(`Supabase tasks query failed: ${tasksErr.message}`)

    const message = buildMessage(tasks ?? [], gmailError, inserted)
    await sendTelegram(message)

    return NextResponse.json({
      ok: true,
      tasksCount: tasks?.length ?? 0,
      unrepliedFromGmail: unreplied.length,
      newEmailTasksInserted: inserted,
      existingEmailTasksSkipped: existingCount,
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

/* ---------------- Gmail OAuth ---------------- */

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

/* ---------------- Email task upsert with dedup ---------------- */

async function upsertEmailTasks(
  sb: any,
  threads: UnrepliedThread[]
): Promise<{ inserted: number; existing: number }> {
  if (threads.length === 0) return { inserted: 0, existing: 0 }

  // Pull every gmail-sourced task ever seen (regardless of status) so we never
  // re-insert one Nick has already actioned, snoozed, done'd, or cancelled.
  const { data: existingRows, error } = await sb
    .from('personal_tasks')
    .select('task_text')
    .eq('source', 'gmail')

  if (error) throw new Error(`Existing email task lookup failed: ${error.message}`)

  const seenThreadIds = new Set<string>()
  for (const row of existingRows ?? []) {
    const match = (row as any).task_text?.match(/\[gmail:([^\]]+)\]/)
    if (match) seenThreadIds.add(match[1])
  }

  const toInsert = threads
    .filter(t => !seenThreadIds.has(t.threadId))
    .map(t => ({
      task_text: `Reply to ${t.fromName}: ${t.subject}\n[gmail:${t.threadId}]`,
      status: 'pending',
      source: 'gmail',
    }))

  if (toInsert.length === 0) {
    return { inserted: 0, existing: seenThreadIds.size }
  }

  const { error: insErr } = await sb.from('personal_tasks').insert(toInsert)
  if (insErr) throw new Error(`Email task insert failed: ${insErr.message}`)

  return { inserted: toInsert.length, existing: seenThreadIds.size }
}

/* ---------------- Message builder ---------------- */

function escapeMarkdown(s: string): string {
  return s.replace(/([_*\[\]`])/g, '\\$1')
}

function buildMessage(
  tasks: Array<{ id: string; task_text: string; status: string; source: string | null }>,
  gmailError: string | null,
  newlyInserted: number
): string {
  const today = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  let msg = `*Daily Digest, ${today}*\n\n`

  if (tasks.length === 0 && !gmailError) {
    return msg + '_No pending tasks. Clean slate._'
  }

  // Split into manual tasks vs email tasks
  const emailTasks = tasks.filter(t => t.source === 'gmail')
  const manualTasks = tasks.filter(t => t.source !== 'gmail')

  if (manualTasks.length > 0) {
    msg += `*Pending Tasks (${manualTasks.length})*\n`
    manualTasks.forEach((t, i) => {
      const firstLine = t.task_text.split('\n')[0].slice(0, 110)
      const tag = t.status === 'snoozed' ? ' (snoozed)' : ''
      msg += `${i + 1}. ${escapeMarkdown(firstLine)}${tag}\n`
    })
    msg += '\n'
  }

  if (emailTasks.length > 0) {
    msg += `*Unreplied Emails (${emailTasks.length})*\n`
    const startNum = manualTasks.length + 1
    emailTasks.forEach((t, i) => {
      const firstLine = t.task_text.split('\n')[0].slice(0, 110)
      const tag = t.status === 'snoozed' ? ' (snoozed)' : ''
      msg += `${startNum + i}. ${escapeMarkdown(firstLine)}${tag}\n`
    })
    msg += '\n'
  }

  if (newlyInserted > 0) {
    msg += `_${newlyInserted} new email task${newlyInserted === 1 ? '' : 's'} added today._\n`
  }

  if (gmailError) {
    msg += `\n_Gmail scan failed: ${escapeMarkdown(gmailError.slice(0, 120))}_\n`
  }

  msg += `\nUse /list for details, /done N to clear, /snooze N 1d to defer.`

  if (msg.length > 3900) msg = msg.slice(0, 3850) + '\n_(truncated)_'
  return msg
}

/* ---------------- Telegram send ---------------- */

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
