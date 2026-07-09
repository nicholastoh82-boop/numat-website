/* lib/portal/repTaskNotify.ts
   One place to notify people about a rep task. The assigned rep is the primary
   recipient; the people in NOTIFY_COPY (Nick) are copied on every event. Each
   recipient gets a push and in-portal notification plus an email. Everything is
   best effort and never throws, so a notification problem cannot break the caller. */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notifyUsers } from '@/lib/portal/push'
import { sendNotificationEmail } from '@/lib/sendgrid'

// Copied on every task notification (assigned, reassigned, overdue).
const NOTIFY_COPY = ['nick@numat.ph']

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function userIdsForEmails(emails: string[]): Promise<string[]> {
  try {
    const { data } = await admin().auth.admin.listUsers()
    const set = new Set(emails.map((e) => e.toLowerCase()))
    return (data?.users || [])
      .filter((u) => u.email && set.has(u.email.toLowerCase()))
      .map((u) => u.id)
  } catch {
    return []
  }
}

export type TaskNotifyEvent = 'assigned' | 'reassigned' | 'overdue'

export async function notifyTask(opts: {
  event: TaskNotifyEvent
  repEmail: string
  repName?: string | null
  title: string
  dueDate?: string | null
  priority?: string | null
  description?: string | null
  actorLabel?: string | null // who assigned or reassigned
}): Promise<void> {
  const rep = opts.repEmail.toLowerCase()
  const copies = NOTIFY_COPY.map((e) => e.toLowerCase()).filter((e) => e !== rep)
  const repDisplay = opts.repName || rep.split('@')[0]
  const actor = opts.actorLabel || 'A manager'
  const dueLine = opts.dueDate ? `, due ${opts.dueDate}` : ''
  const summary = `${opts.title}${dueLine}`

  let repPushTitle: string
  let repSubject: string
  let repIntro: string
  let copyPushTitle: string
  let copySubject: string
  let copyIntro: string

  if (opts.event === 'assigned') {
    repPushTitle = `New task from ${actor}`
    repSubject = `New task from ${actor}: ${opts.title}`
    repIntro = `${esc(actor)} assigned you a task in the NUMAT portal.`
    copyPushTitle = `Task assigned to ${repDisplay}`
    copySubject = `Task assigned to ${repDisplay}: ${opts.title}`
    copyIntro = `${esc(actor)} assigned a task to ${esc(repDisplay)}.`
  } else if (opts.event === 'reassigned') {
    repPushTitle = `Task reassigned to you`
    repSubject = `Task reassigned to you: ${opts.title}`
    repIntro = `${esc(actor)} reassigned a task to you in the NUMAT portal.`
    copyPushTitle = `Task reassigned to ${repDisplay}`
    copySubject = `Task reassigned to ${repDisplay}: ${opts.title}`
    copyIntro = `${esc(actor)} reassigned a task to ${esc(repDisplay)}.`
  } else {
    repPushTitle = `Task overdue`
    repSubject = `Overdue task: ${opts.title}`
    repIntro = `This task is now past its due date. Please update it in the portal.`
    copyPushTitle = `${repDisplay} has an overdue task`
    copySubject = `Overdue task for ${repDisplay}: ${opts.title}`
    copyIntro = `${esc(repDisplay)} has a task that is past its due date.`
  }

  const html = (intro: string) => `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:560px;">
      <h2 style="margin:0 0 8px;">${opts.event === 'overdue' ? 'Overdue task' : 'Task'}</h2>
      <p style="margin:0 0 16px;color:#555;">${intro}</p>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;color:#555;">Task</td><td style="padding:4px 0;"><strong>${esc(opts.title)}</strong></td></tr>
        ${opts.dueDate ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Due</td><td style="padding:4px 0;">${esc(opts.dueDate)}</td></tr>` : ''}
        ${opts.priority ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Priority</td><td style="padding:4px 0;">${esc(opts.priority)}</td></tr>` : ''}
        ${opts.description ? `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top;">Details</td><td style="padding:4px 0;">${esc(opts.description)}</td></tr>` : ''}
      </table>
      <p style="margin:16px 0 0;"><a href="https://numatbamboo.com/portal/rep-tasks" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Open tasks</a></p>
    </div>`

  // Push + in-portal notification.
  try {
    const repIds = await userIdsForEmails([rep])
    if (repIds.length) {
      await notifyUsers({ userIds: repIds, title: repPushTitle, body: summary, url: '/portal/rep-tasks' })
    }
  } catch (e) {
    console.error('[task notify] rep push failed:', e)
  }
  if (copies.length) {
    try {
      const copyIds = await userIdsForEmails(copies)
      if (copyIds.length) {
        await notifyUsers({ userIds: copyIds, title: copyPushTitle, body: summary, url: '/portal/rep-tasks' })
      }
    } catch (e) {
      console.error('[task notify] copy push failed:', e)
    }
  }

  // Email.
  try {
    await sendNotificationEmail({ to: rep, subject: repSubject, html: html(repIntro) })
  } catch (e) {
    console.error('[task notify] rep email failed:', e)
  }
  for (const c of copies) {
    try {
      await sendNotificationEmail({ to: c, subject: copySubject, html: html(copyIntro) })
    } catch (e) {
      console.error('[task notify] copy email failed:', e)
    }
  }
}
