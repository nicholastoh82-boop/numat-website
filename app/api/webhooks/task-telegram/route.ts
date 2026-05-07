import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CRON_SECRET = process.env.CRON_SECRET!

// AI Gateway envs (already set on numatbamboo project)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
const CF_AIG_TOKEN = process.env.CF_AIG_TOKEN

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

/* ================= TELEGRAM HELPERS ================= */

async function tgSend(text: string, opts: { parse_mode?: string; reply_markup?: any } = {}) {
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= 4000) {
      chunks.push(remaining)
      break
    }
    let cut = remaining.lastIndexOf('\n', 4000)
    if (cut < 1000) cut = 4000
    chunks.push(remaining.slice(0, cut))
    remaining = remaining.slice(cut)
  }

  for (let i = 0; i < chunks.length; i++) {
    const body: any = { chat_id: TELEGRAM_CHAT_ID, text: chunks[i], disable_web_page_preview: true }
    if (opts.parse_mode) body.parse_mode = opts.parse_mode
    if (opts.reply_markup && i === chunks.length - 1) body.reply_markup = opts.reply_markup
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
}

async function tgAnswerCallback(callbackId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text: text ?? '' }),
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ================= INLINE KEYBOARD ================= */

const MAIN_MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📋 Tasks', callback_data: 'cmd:list' },
      { text: '📊 Stats', callback_data: 'cmd:stats' },
    ],
    [
      { text: '📧 Leads', callback_data: 'cmd:leads' },
      { text: '🔄 Pipeline', callback_data: 'cmd:pipeline' },
    ],
    [
      { text: '📨 Digest', callback_data: 'cmd:digest' },
      { text: '❓ Help', callback_data: 'cmd:help' },
    ],
    [{ text: '🤖 Ask Claude', callback_data: 'cmd:ask_prompt' }],
  ],
}

async function sendMenu() {
  await tgSend('Pick an option:', { reply_markup: MAIN_MENU_KEYBOARD })
}

/* ================= WEBHOOK HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    // Callback query from inline keyboard
    if (update.callback_query) {
      const cq = update.callback_query
      const fromChatId = String(cq.message?.chat?.id ?? '')
      if (fromChatId !== TELEGRAM_CHAT_ID) {
        await tgAnswerCallback(cq.id, 'Not authorized')
        return NextResponse.json({ ok: true })
      }
      await tgAnswerCallback(cq.id)
      const data: string = cq.data || ''
      if (data.startsWith('cmd:')) {
        const cmd = data.slice(4)
        await dispatchCommand(cmd, '')
      }
      return NextResponse.json({ ok: true })
    }

    // Regular message
    const message = update.message
    if (!message) return NextResponse.json({ ok: true })

    const fromChatId = String(message.chat?.id ?? '')
    if (fromChatId !== TELEGRAM_CHAT_ID) return NextResponse.json({ ok: true })

    const raw = (message.text || '').trim()
    if (!raw) return NextResponse.json({ ok: true })

    const lower = raw.toLowerCase()
    const cmd = lower.startsWith('/') ? lower.slice(1).split(/\s+/)[0] : lower.split(/\s+/)[0]
    const rest = raw.replace(/^\/?\S+\s*/, '').trim()

    await dispatchCommand(cmd, rest, raw)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('task-telegram webhook error:', err)
    try { await tgSend(`Webhook error: ${err?.message ?? err}`) } catch {}
    return NextResponse.json({ ok: true })
  }
}

/* ================= COMMAND DISPATCH ================= */

async function dispatchCommand(cmd: string, rest: string, original?: string) {
  switch (cmd) {
    case 'menu':
    case 'start':
      return sendMenu()

    case 'help':
      return sendHelp()

    case 'list':
    case 'tasks':
      return sendList()

    case 'done':
      return handleDone(rest)

    case 'snooze':
      return handleSnooze(rest)

    case 'cancel':
      return handleCancel(rest)

    case 'stats':
      return sendStats()

    case 'leads':
      return sendLeads()

    case 'lead':
      return sendLeadDetail(rest)

    case 'pipeline':
      return sendPipeline()

    case 'digest':
      return triggerDigest()

    case 'ask':
      return handleAsk(rest)

    case 'ask_prompt':
      return tgSend('Send your question prefixed with /ask, for example:\n\n/ask how many hospitality leads have budget above RM500K')

    default:
      // Free text becomes a new task (preserves existing behavior)
      if (original) return createTask(original)
      return
  }
}

/* ================= EXISTING COMMANDS ================= */

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

async function sendHelp() {
  const text =
    `<b>NUMAT Ops Agent commands</b>\n\n` +
    `/menu - show button menu\n` +
    `/list - pending tasks\n` +
    `/done N - mark task N done\n` +
    `/snooze N 1d - snooze task N\n` +
    `/cancel N - cancel task N\n\n` +
    `<b>Quick info</b>\n` +
    `/stats - today's email outreach numbers\n` +
    `/leads - recent form submissions\n` +
    `/lead &lt;id&gt; - lead detail by id\n` +
    `/pipeline - active leads per rep\n` +
    `/digest - run daily digest now\n\n` +
    `<b>Ask anything</b>\n` +
    `/ask &lt;question&gt; - free text query, Claude answers with CRM context\n\n` +
    `Or just type any message and it becomes a new task.`
  await tgSend(text, { parse_mode: 'HTML' })
}

async function sendList() {
  const { data, error } = await sb()
    .from('personal_tasks')
    .select('id, task_text, status, snoozed_until, created_at')
    .in('status', ['pending', 'snoozed'])
    .order('created_at', { ascending: true })

  if (error) return tgSend(`List failed: ${error.message}`)
  if (!data || data.length === 0) return tgSend('No pending tasks. Clean slate.')

  let msg = `Pending tasks:\n`
  data.forEach((t, i) => {
    const first = (t.task_text || '').split('\n')[0].slice(0, 110)
    const tag = t.status === 'snoozed' ? ' (snoozed)' : ''
    msg += `${i + 1}. ${first}${tag}\n`
  })
  msg += `\nReply "/done N" or "/snooze N 4h"`
  await tgSend(msg)
}

async function handleDone(rest: string) {
  const target = rest.trim().toLowerCase()
  const { data: tasks } = await sb()
    .from('personal_tasks')
    .select('id, task_text')
    .in('status', ['pending', 'snoozed'])
    .order('created_at', { ascending: true })

  if (target === 'all') {
    if (!tasks || tasks.length === 0) return tgSend('No tasks to mark done.')
    await sb().from('personal_tasks').update({ status: 'done', completed_at: new Date().toISOString() }).in('id', tasks.map(t => t.id))
    return tgSend(`Marked ${tasks.length} tasks done.`)
  }

  const n = parseInt(target, 10)
  if (!n || !tasks || n < 1 || n > tasks.length) return tgSend('Use "/done N" with a number from /list, or /done all')
  const t = tasks[n - 1]
  await sb().from('personal_tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', t.id)
  await tgSend(`Done: ${(t.task_text || '').split('\n')[0].slice(0, 80)}`)
}

async function handleSnooze(rest: string) {
  const parts = rest.trim().split(/\s+/)
  const n = parseInt(parts[0], 10)
  const dur = parts[1] || '4h'
  const m = dur.match(/^(\d+)\s*(h|d|m)$/i)
  if (!n || !m) return tgSend('Use "/snooze N 4h" or "/snooze N 2d"')

  const amount = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  const ms = unit === 'h' ? amount * 3600e3 : unit === 'd' ? amount * 86400e3 : amount * 60e3
  const until = new Date(Date.now() + ms).toISOString()

  const { data: tasks } = await sb()
    .from('personal_tasks')
    .select('id, task_text')
    .in('status', ['pending', 'snoozed'])
    .order('created_at', { ascending: true })

  if (!tasks || n < 1 || n > tasks.length) return tgSend('Bad task number. Try /list first.')
  const t = tasks[n - 1]
  await sb().from('personal_tasks').update({ status: 'snoozed', snoozed_until: until }).eq('id', t.id)
  await tgSend(`Snoozed for ${dur}: ${(t.task_text || '').split('\n')[0].slice(0, 80)}`)
}

async function handleCancel(rest: string) {
  const n = parseInt(rest.trim(), 10)
  const { data: tasks } = await sb()
    .from('personal_tasks')
    .select('id, task_text')
    .in('status', ['pending', 'snoozed'])
    .order('created_at', { ascending: true })

  if (!n || !tasks || n < 1 || n > tasks.length) return tgSend('Use "/cancel N" with a number from /list')
  const t = tasks[n - 1]
  await sb().from('personal_tasks').update({ status: 'cancelled' }).eq('id', t.id)
  await tgSend(`Cancelled: ${(t.task_text || '').split('\n')[0].slice(0, 80)}`)
}

async function createTask(text: string) {
  if (text.startsWith('/')) return // safeguard
  const { error } = await sb().from('personal_tasks').insert({
    task_text: text, status: 'pending', source: 'telegram'
  })
  if (error) return tgSend(`Could not save task: ${error.message}`)
  await tgSend(`Task saved.`)
}

/* ================= NEW TIER 1 COMMANDS ================= */

async function sendStats() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startISO = start.toISOString()

  const reps = ['Bryan', 'Mohan', 'Nick']
  let msg = `Today's email outreach (${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} MYT):\n\n`

  for (const rep of reps) {
    const [{ count: sent }, { count: bounced }, { count: replied }, { count: skipped }] = await Promise.all([
      sb().from('campaign_messages').select('id', { count: 'exact', head: true }).eq('rep_assigned', rep).eq('status', 'sent').gte('sent_at', startISO),
      sb().from('campaign_messages').select('id', { count: 'exact', head: true }).eq('rep_assigned', rep).not('bounced_at', 'is', null).gte('bounced_at', startISO),
      sb().from('master_leads').select('id', { count: 'exact', head: true }).eq('rep_assigned', rep).not('replied_at', 'is', null).gte('replied_at', startISO),
      sb().from('campaign_messages').select('id', { count: 'exact', head: true }).eq('rep_assigned', rep).eq('status', 'skipped').gte('updated_at', startISO),
    ])
    const total = (sent ?? 0) + (bounced ?? 0)
    const rate = total > 0 ? ((bounced ?? 0) / total * 100).toFixed(1) : '0.0'
    msg += `${rep}: ${sent ?? 0} sent, ${bounced ?? 0} bounced (${rate}%), ${skipped ?? 0} skipped, ${replied ?? 0} replies\n`
  }
  await tgSend(msg)
}

async function sendLeads() {
  const since = new Date(Date.now() - 7 * 86400e3).toISOString()
  const { data, error } = await sb()
    .from('master_leads')
    .select('id, full_name, company, segment, source, created_at, rep_assigned')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(15)

  if (error) return tgSend(`Leads query failed: ${error.message}`)
  if (!data || data.length === 0) return tgSend('No new leads in the last 7 days.')

  let msg = `Last 7 days, ${data.length} leads:\n\n`
  data.forEach(l => {
    const date = new Date(l.created_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    msg += `${date}  ${l.full_name || l.company || '(no name)'}\n`
    msg += `   ${l.company || ''} · ${l.segment || '—'} · ${l.rep_assigned || '—'}\n`
    msg += `   ${l.id}\n\n`
  })
  msg += `Use /lead <id> for full details.`
  await tgSend(msg)
}

async function sendLeadDetail(idArg: string) {
  const id = idArg.trim()
  if (!id) return tgSend('Use "/lead <id>", get ids from /leads')

  const { data, error } = await sb()
    .from('master_leads')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return tgSend(`Lookup failed: ${error.message}`)
  if (!data) return tgSend('Lead not found')

  const sp = (data as any).source_payload || {}
  const arr = (v: any) => Array.isArray(v) ? v.join(', ') : (v || '—')
  const t = (v: any) => v && String(v).trim() ? String(v) : '—'

  let msg = `<b>${escapeHtml(t(data.full_name))}</b>\n`
  msg += `${escapeHtml(t((data as any).title))} at ${escapeHtml(t(data.company))}\n\n`
  msg += `Email: ${escapeHtml(t(data.email))}\n`
  msg += `Phone: ${escapeHtml(t((data as any).phone))}\n`
  msg += `Country: ${escapeHtml(t((data as any).country))}\n`
  msg += `Segment: ${escapeHtml(t((data as any).segment))}\n`
  msg += `Rep: ${escapeHtml(t((data as any).rep_assigned))}\n`
  msg += `Stage: ${escapeHtml(t((data as any).pipeline_stage || (data as any).status))}\n`

  if (Object.keys(sp).length > 0) {
    msg += `\n<b>Form answers</b>\n`
    if (sp.project_name) msg += `Project: ${escapeHtml(String(sp.project_name))}\n`
    if (sp.project_types) msg += `Types: ${escapeHtml(arr(sp.project_types))}\n`
    if (sp.project_stages) msg += `Stages: ${escapeHtml(arr(sp.project_stages))}\n`
    if (sp.support_types) msg += `Support: ${escapeHtml(arr(sp.support_types))}\n`
    if (sp.timeline) msg += `Timeline: ${escapeHtml(t(sp.timeline))}\n`
    if (sp.budget_range) msg += `Budget: ${escapeHtml(t(sp.budget_range))}\n`
    if (sp.sustainability_importance) msg += `Sustainability: ${escapeHtml(t(sp.sustainability_importance))}\n`
    if (sp.follow_up_consultation) msg += `Wants consult: ${escapeHtml(t(sp.follow_up_consultation))}\n`
    if (sp.project_description) msg += `\nDescription: ${escapeHtml(t(sp.project_description))}\n`
  }
  await tgSend(msg, { parse_mode: 'HTML' })
}

async function sendPipeline() {
  const reps = ['Bryan', 'Mohan', 'Nick']
  let msg = `Active pipeline:\n\n`
  for (const rep of reps) {
    const { data } = await sb()
      .from('master_leads')
      .select('pipeline_stage, status')
      .eq('rep_assigned', rep)
      .or('sequence_paused.is.null,sequence_paused.eq.false')
      .is('replied_at', null)
      .not('status', 'in', '(suppressed,closed,bounced)')

    const total = data?.length ?? 0
    const stages: Record<string, number> = {}
    for (const r of data ?? []) {
      const s = (r as any).pipeline_stage || (r as any).status || 'new'
      stages[s] = (stages[s] || 0) + 1
    }
    msg += `${rep}: ${total} active\n`
    for (const [k, v] of Object.entries(stages).sort((a, b) => b[1] - a[1])) {
      msg += `  ${k}: ${v}\n`
    }
    msg += `\n`
  }
  await tgSend(msg)
}

async function triggerDigest() {
  await tgSend('Triggering digest now...')
  try {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://numatbamboo.com'}/api/cron/daily-digest`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${CRON_SECRET}` } })
    if (!r.ok) {
      const body = await r.text()
      await tgSend(`Digest trigger failed (${r.status}): ${body.slice(0, 200)}`)
    }
  } catch (err: any) {
    await tgSend(`Digest trigger error: ${err?.message ?? err}`)
  }
}

/* ================= TIER 2: ASK CLAUDE ================= */

async function handleAsk(question: string) {
  const q = question.trim()
  if (!q) return tgSend('Send "/ask <your question>"\n\nExamples:\n/ask how many hospitality leads have budget above RM500K\n/ask which leads have not been contacted in 14 days\n/ask draft a follow up email to the latest SEAD form submission')

  if (!ANTHROPIC_API_KEY) return tgSend('Ask is not configured: ANTHROPIC_API_KEY missing')

  await tgSend('Thinking...')

  // Pull a small CRM context window. Keep it bounded, this is sent to Claude.
  const supa = sb()

  const [pipelineRes, formLeadsRes, statsRes, tasksRes] = await Promise.all([
    supa.from('master_leads')
      .select('id, full_name, company, email, country, segment, rep_assigned, pipeline_stage, status, last_activity_at, replied_at, created_at')
      .or('sequence_paused.is.null,sequence_paused.eq.false')
      .order('created_at', { ascending: false })
      .limit(60),
    supa.from('master_leads')
      .select('id, full_name, company, source, source_payload, created_at, rep_assigned')
      .like('source', 'sead_qualification%')
      .order('created_at', { ascending: false })
      .limit(15),
    supa.from('campaign_messages')
      .select('rep_assigned, status, sent_at, bounced_at')
      .gte('sent_at', new Date(Date.now() - 7 * 86400e3).toISOString())
      .limit(500),
    supa.from('personal_tasks')
      .select('id, task_text, status, source, created_at')
      .in('status', ['pending', 'snoozed'])
      .limit(40),
  ])

  const context = {
    today_local: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Manila' }),
    active_leads: pipelineRes.data ?? [],
    recent_form_submissions: formLeadsRes.data ?? [],
    last_7d_messages: statsRes.data ?? [],
    pending_tasks: tasksRes.data ?? [],
  }

  const systemPrompt =
    `You are Nick's NUMAT Ops Agent in Telegram. You answer questions about NUMAT's CRM data.\n` +
    `Constraints:\n` +
    `- Be terse and direct. No preamble, no recap of the question.\n` +
    `- Use plain text or simple HTML tags (b, i). No markdown asterisks.\n` +
    `- Output stays under 3500 characters.\n` +
    `- If asked to draft an email, follow Nick's signature rules: Bryan = "Chief Operating Officer", Mohan = "Head of Growth", Nick = "Business Administrator".\n` +
    `- Never claim NUMAT certifications, LEED credits, fire ratings, ASTM ratings.\n` +
    `- No hyphens or dashes in any output. Use commas, colons, parentheses, or new sentences instead.\n` +
    `- If the data does not contain the answer, say so plainly.\n`

  const userPrompt =
    `<context>\n${JSON.stringify(context).slice(0, 50000)}\n</context>\n\n` +
    `Question: ${q}`

  try {
    const headers: Record<string, string> = {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }
    if (CF_AIG_TOKEN) headers['cf-aig-authorization'] = `Bearer ${CF_AIG_TOKEN}`

    const resp = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const json: any = await resp.json()
    if (!resp.ok) {
      await tgSend(`Claude error (${resp.status}): ${json?.error?.message || JSON.stringify(json).slice(0, 300)}`)
      return
    }

    const text = (json?.content?.[0]?.text as string) || '(empty response)'
    await tgSend(text)
  } catch (err: any) {
    await tgSend(`Ask failed: ${err?.message ?? err}`)
  }
}
