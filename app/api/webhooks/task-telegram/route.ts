// app/api/webhooks/task-telegram/route.ts
//
// Receives inbound Telegram messages via webhook.
// Handles:
//   - New task logging: any message that isn't a command creates a task
//   - "done N" or "done all": marks task(s) complete
//   - "snooze N" or "snooze N 2h": snoozes a task
//   - "list": shows pending tasks
//   - "cancel N": cancels a task
//   - "help" or "/start": shows available commands
//
// Set the webhook via:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yourdomain.vercel.app/api/webhooks/task-telegram

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID!

async function sendTelegram(chatId: string | number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })
}

function parseSnooze(arg: string | undefined): Date {
  if (!arg) {
    const d = new Date()
    d.setHours(d.getHours() + 2)
    return d
  }
  const match = arg.match(/^(\d+)(h|d|m)$/)
  if (!match) {
    const d = new Date()
    d.setHours(d.getHours() + 2)
    return d
  }
  const amount = parseInt(match[1])
  const unit = match[2]
  const d = new Date()
  if (unit === 'h') d.setHours(d.getHours() + amount)
  else if (unit === 'd') d.setDate(d.getDate() + amount)
  else if (unit === 'm') d.setMinutes(d.getMinutes() + amount)
  return d
}

export async function POST(req: NextRequest) {
  const update = await req.json()

  // Only handle text messages
  const message = update.message
  if (!message || !message.text) {
    return NextResponse.json({ ok: true })
  }

  const chatId = String(message.chat.id)
  const msgBody = message.text.trim()

  // Only respond to messages from Nick's chat
  if (chatId !== ALLOWED_CHAT_ID) {
    await sendTelegram(chatId, 'This bot only responds to its owner.')
    return NextResponse.json({ ok: true })
  }

  // Strip leading slash for bot commands (e.g. /list -> list)
  const cleaned = msgBody.startsWith('/') ? msgBody.slice(1) : msgBody
  const lower = cleaned.toLowerCase()
  const parts = lower.split(/\s+/)
  const cmd = parts[0]

  // LIST command
  if (cmd === 'list' || cmd === 'tasks') {
    const { data } = await supabase
      .from('personal_tasks')
      .select('id, task_text, reminder_count, created_at')
      .in('status', ['pending', 'snoozed'])
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) {
      await sendTelegram(chatId, '✅ No pending tasks. You are all caught up!')
      return NextResponse.json({ ok: true })
    }

    const lines = data.map((t, i) =>
      `${i + 1}. ${t.task_text}${t.reminder_count > 0 ? ` _(reminded ${t.reminder_count}x)_` : ''}`
    )
    await sendTelegram(chatId, `*Pending tasks:*\n${lines.join('\n')}\n\nReply \`done 1\` or \`snooze 2 4h\``)
    return NextResponse.json({ ok: true })
  }

  // DONE command: done 1 or done all
  if (cmd === 'done') {
    const arg = parts[1]

    if (arg === 'all') {
      await supabase
        .from('personal_tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .in('status', ['pending', 'snoozed'])

      await sendTelegram(chatId, '✅ All tasks marked as done. Good work.')
      return NextResponse.json({ ok: true })
    }

    const idx = parseInt(arg)
    if (isNaN(idx) || idx < 1) {
      await sendTelegram(chatId, 'Usage: `done 1` (or `done all`)')
      return NextResponse.json({ ok: true })
    }

    const { data } = await supabase
      .from('personal_tasks')
      .select('id, task_text')
      .in('status', ['pending', 'snoozed'])
      .order('created_at', { ascending: true })

    if (!data || data.length < idx) {
      await sendTelegram(chatId, `No task number ${idx}. Reply \`list\` to see your tasks.`)
      return NextResponse.json({ ok: true })
    }

    const task = data[idx - 1]
    await supabase
      .from('personal_tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', task.id)

    await sendTelegram(chatId, `✅ Done: ${task.task_text}`)
    return NextResponse.json({ ok: true })
  }

  // SNOOZE command: snooze 1 or snooze 1 4h
  if (cmd === 'snooze') {
    const idx = parseInt(parts[1])
    const duration = parts[2]

    if (isNaN(idx) || idx < 1) {
      await sendTelegram(chatId, 'Usage: `snooze 1` or `snooze 1 4h`')
      return NextResponse.json({ ok: true })
    }

    const { data } = await supabase
      .from('personal_tasks')
      .select('id, task_text')
      .in('status', ['pending', 'snoozed'])
      .order('created_at', { ascending: true })

    if (!data || data.length < idx) {
      await sendTelegram(chatId, `No task number ${idx}. Reply \`list\` to see your tasks.`)
      return NextResponse.json({ ok: true })
    }

    const task = data[idx - 1]
    const until = parseSnooze(duration)

    await supabase
      .from('personal_tasks')
      .update({ status: 'snoozed', snoozed_until: until.toISOString() })
      .eq('id', task.id)

    const timeStr = until.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' })
    await sendTelegram(chatId, `😴 Snoozed: ${task.task_text}\nWill remind you after ${timeStr} (MYT)`)
    return NextResponse.json({ ok: true })
  }

  // CANCEL command
  if (cmd === 'cancel') {
    const idx = parseInt(parts[1])
    if (isNaN(idx) || idx < 1) {
      await sendTelegram(chatId, 'Usage: `cancel 1`')
      return NextResponse.json({ ok: true })
    }

    const { data } = await supabase
      .from('personal_tasks')
      .select('id, task_text')
      .in('status', ['pending', 'snoozed'])
      .order('created_at', { ascending: true })

    if (!data || data.length < idx) {
      await sendTelegram(chatId, `No task number ${idx}.`)
      return NextResponse.json({ ok: true })
    }

    const task = data[idx - 1]
    await supabase
      .from('personal_tasks')
      .update({ status: 'cancelled' })
      .eq('id', task.id)

    await sendTelegram(chatId, `🗑 Cancelled: ${task.task_text}`)
    return NextResponse.json({ ok: true })
  }

  // HELP / START command
  if (cmd === 'help' || cmd === '?' || cmd === 'start') {
    await sendTelegram(
      chatId,
      `*NUMAT Ops Agent* 🤖\n\n` +
      `Send any text to add a task\n` +
      `\`list\` — see pending tasks\n` +
      `\`done 1\` — complete task 1\n` +
      `\`done all\` — clear everything\n` +
      `\`snooze 1 4h\` — snooze 4 hours\n` +
      `\`cancel 1\` — remove a task`
    )
    return NextResponse.json({ ok: true })
  }

  // Default: treat message as a new task
  const { error } = await supabase
    .from('personal_tasks')
    .insert({ task_text: msgBody, status: 'pending', source: 'telegram' })

  if (error) {
    console.error('Task insert error:', error)
    await sendTelegram(chatId, '❌ Something went wrong saving your task. Please try again.')
    return NextResponse.json({ ok: true })
  }

  // Count pending tasks so Nick knows his queue size
  const { count } = await supabase
    .from('personal_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  await sendTelegram(chatId, `📝 Task saved: ${msgBody}\nYou now have ${count} pending task${count !== 1 ? 's' : ''}. Reply \`list\` to see all.`)
  return NextResponse.json({ ok: true })
}
