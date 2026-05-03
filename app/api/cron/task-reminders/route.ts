// app/api/cron/task-reminders/route.ts
//
// Vercel Cron: runs every 3 hours.
// Checks for pending/snoozed tasks and sends Telegram reminders.
//
// Add to vercel.json crons:
//   { "path": "/api/cron/task-reminders", "schedule": "0 */3 * * *" }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!

async function sendTelegram(text: string): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  })
  return res.ok
}

async function handle(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Fetch tasks that need reminding:
  // 1. pending tasks older than 30 minutes that haven't been reminded in the last 3 hours
  // 2. snoozed tasks whose snooze has expired
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()

  const { data: pendingTasks } = await supabase
    .from('personal_tasks')
    .select('id, task_text, reminder_count, last_reminded_at, created_at')
    .eq('status', 'pending')
    .lt('created_at', thirtyMinAgo)
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${threeHoursAgo}`)
    .order('created_at', { ascending: true })

  const { data: snoozedTasks } = await supabase
    .from('personal_tasks')
    .select('id, task_text, reminder_count')
    .eq('status', 'snoozed')
    .lt('snoozed_until', now.toISOString())
    .order('created_at', { ascending: true })

  const tasksToRemind = [
    ...(pendingTasks || []),
    ...(snoozedTasks || []),
  ]

  if (tasksToRemind.length === 0) {
    return NextResponse.json({ reminders_sent: 0, message: 'No tasks due for reminding' })
  }

  // Wake snoozed tasks back to pending
  if (snoozedTasks && snoozedTasks.length > 0) {
    const ids = snoozedTasks.map(t => t.id)
    await supabase
      .from('personal_tasks')
      .update({ status: 'pending', snoozed_until: null })
      .in('id', ids)
  }

  // Build reminder message
  const lines = tasksToRemind.map((t, i) => {
    const times = t.reminder_count > 0 ? ` _(reminded ${t.reminder_count}x)_` : ''
    return `${i + 1}. ${t.task_text}${times}`
  })

  const emoji = tasksToRemind.length > 3 ? '🔴' : tasksToRemind.length > 1 ? '🟡' : '🟢'
  const message =
    `${emoji} *You have ${tasksToRemind.length} unfinished task${tasksToRemind.length > 1 ? 's' : ''}:*\n\n` +
    lines.join('\n') +
    `\n\nReply \`done 1\`, \`snooze 2 2h\`, or \`list\``

  const sent = await sendTelegram(message)
  if (!sent) {
    console.error('Telegram send error')
    return NextResponse.json({ error: 'Failed to send Telegram message' }, { status: 500 })
  }

  // Update reminder counts and timestamps
  const ids = tasksToRemind.map(t => t.id)
  for (const task of tasksToRemind) {
    await supabase
      .from('personal_tasks')
      .update({
        reminder_count: (task.reminder_count || 0) + 1,
        last_reminded_at: now.toISOString(),
      })
      .eq('id', task.id)
  }

  return NextResponse.json({
    reminders_sent: tasksToRemind.length,
    task_ids: ids,
  })
}

export async function GET(req: NextRequest) { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }
