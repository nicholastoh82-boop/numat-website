import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notifyUsers } from '@/lib/portal/push'
import { sendNotificationEmail } from '@/lib/sendgrid'

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Managers can assign tasks and see every task. Everyone else (the reps) sees and
// updates only their own. Erica, Nick, and Mark are the managers.
const MANAGERS = ['nick@numat.ph', 'erica@numat.ph', 'mark@numat.ph']

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function whoami(): Promise<{ email: string | null; isManager: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() || null
  return { email, isManager: !!email && MANAGERS.includes(email) }
}

// GET: managers get all tasks plus the assignable rep list; reps get their own.
export async function GET() {
  const { email, isManager } = await whoami()
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const db = adminDb()
  let query = db.from('rep_tasks').select('*').order('created_at', { ascending: false })
  if (!isManager) query = query.eq('assigned_to_email', email)
  const { data: tasks, error } = await query
  if (error) {
    console.error('[rep-tasks] load failed:', error)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }

  let reps: { email: string; name: string }[] = []
  if (isManager) {
    const { data } = await db
      .from('crm_users')
      .select('email, name, rep_assigned_name')
      .eq('role', 'rep')
      .eq('is_active', true)
      .order('name')
    reps = (data || [])
      .filter((r) => !MANAGERS.includes(String(r.email).toLowerCase()))
      .map((r) => ({
        email: r.email,
        name: r.rep_assigned_name || r.name || String(r.email).split('@')[0],
      }))
  }

  return NextResponse.json({ tasks: tasks || [], reps, isManager, me: email })
}

// POST: create and assign a task. Managers only.
export async function POST(request: NextRequest) {
  const { email, isManager } = await whoami()
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!isManager) return NextResponse.json({ error: 'Only managers can assign tasks.' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const title = String(body?.title ?? '').trim()
  const assignedTo = String(body?.assigned_to_email ?? '').toLowerCase().trim()
  if (!title || !assignedTo) {
    return NextResponse.json({ error: 'A title and an assignee are required.' }, { status: 400 })
  }

  const db = adminDb()
  const { data: assignee } = await db
    .from('crm_users')
    .select('name, rep_assigned_name')
    .eq('email', assignedTo)
    .maybeSingle()
  const assignedName = assignee?.rep_assigned_name || assignee?.name || assignedTo.split('@')[0]

  const { data: me } = await db.from('crm_users').select('name').eq('email', email).maybeSingle()

  const { data, error } = await db
    .from('rep_tasks')
    .insert({
      title,
      description: body?.description ? String(body.description).trim() : null,
      assigned_to_email: assignedTo,
      assigned_to_name: assignedName,
      assigned_by_email: email,
      assigned_by_name: me?.name || email.split('@')[0],
      priority: ['low', 'normal', 'high'].includes(body?.priority) ? body.priority : 'normal',
      due_date: body?.due_date || null,
      related_lead_id: body?.related_lead_id || null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[rep-tasks] create failed:', error)
    return NextResponse.json({ error: 'Could not create the task.' }, { status: 500 })
  }

  // Notify the rep. A push and in-portal notification (instant, if they have a
  // device subscribed) plus an email (reliable, everyone has one). Best effort:
  // a notification problem must never fail the task creation.
  try {
    const assignerLabel = me?.name || email.split('@')[0]
    const dueLine = body?.due_date ? `, due ${body.due_date}` : ''
    const summary = `${title}${dueLine}`

    try {
      const { data: userList } = await db.auth.admin.listUsers()
      const repUser = userList?.users?.find((u) => u.email?.toLowerCase() === assignedTo)
      if (repUser?.id) {
        await notifyUsers({
          userIds: [repUser.id],
          title: `New task from ${assignerLabel}`,
          body: summary,
          url: '/portal/rep-tasks',
        })
      }
    } catch (pushErr) {
      console.error('[rep-tasks] push notify failed:', pushErr)
    }

    try {
      await sendNotificationEmail({
        to: assignedTo,
        subject: `New task from ${assignerLabel}: ${title}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:560px;">
            <h2 style="margin:0 0 8px;">You have a new task</h2>
            <p style="margin:0 0 16px;color:#555;">${escapeHtml(assignerLabel)} assigned you a task in the NUMAT portal.</p>
            <table style="border-collapse:collapse;">
              <tr><td style="padding:4px 12px 4px 0;color:#555;">Task</td><td style="padding:4px 0;"><strong>${escapeHtml(title)}</strong></td></tr>
              ${body?.due_date ? `<tr><td style="padding:4px 12px 4px 0;color:#555;">Due</td><td style="padding:4px 0;">${escapeHtml(String(body.due_date))}</td></tr>` : ''}
              <tr><td style="padding:4px 12px 4px 0;color:#555;">Priority</td><td style="padding:4px 0;">${['low', 'normal', 'high'].includes(body?.priority) ? body.priority : 'normal'}</td></tr>
              ${body?.description ? `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top;">Details</td><td style="padding:4px 0;">${escapeHtml(String(body.description))}</td></tr>` : ''}
            </table>
            <p style="margin:16px 0 0;">
              <a href="https://numatbamboo.com/portal/rep-tasks" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Open your tasks</a>
            </p>
          </div>`,
      })
    } catch (mailErr) {
      console.error('[rep-tasks] email notify failed:', mailErr)
    }
  } catch (notifyErr) {
    console.error('[rep-tasks] notify failed:', notifyErr)
  }

  return NextResponse.json({ ok: true, id: data.id })
}

// PATCH: managers can edit any field; reps can update only the status of their own task.
export async function PATCH(request: NextRequest) {
  const { email, isManager } = await whoami()
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const id = String(body?.id ?? '')
  if (!id) return NextResponse.json({ error: 'Missing task id.' }, { status: 400 })

  const db = adminDb()
  const { data: task } = await db
    .from('rep_tasks')
    .select('assigned_to_email')
    .eq('id', id)
    .maybeSingle()
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  const isOwnerRep = String(task.assigned_to_email).toLowerCase() === email
  if (!isManager && !isOwnerRep) {
    return NextResponse.json({ error: 'You can only update your own tasks.' }, { status: 403 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body?.status && ['open', 'in_progress', 'done', 'cancelled'].includes(body.status)) {
    patch.status = body.status
    patch.completed_at = body.status === 'done' ? new Date().toISOString() : null
  }

  // Only managers may edit the rest of the fields or reassign.
  if (isManager) {
    if (typeof body?.title === 'string' && body.title.trim()) patch.title = body.title.trim()
    if (typeof body?.description === 'string') patch.description = body.description.trim() || null
    if (['low', 'normal', 'high'].includes(body?.priority)) patch.priority = body.priority
    if (body?.due_date !== undefined) patch.due_date = body.due_date || null
    if (typeof body?.assigned_to_email === 'string' && body.assigned_to_email.trim()) {
      const newAssignee = body.assigned_to_email.toLowerCase().trim()
      const { data: a } = await db
        .from('crm_users')
        .select('name, rep_assigned_name')
        .eq('email', newAssignee)
        .maybeSingle()
      patch.assigned_to_email = newAssignee
      patch.assigned_to_name = a?.rep_assigned_name || a?.name || newAssignee.split('@')[0]
    }
  }

  const { error } = await db.from('rep_tasks').update(patch).eq('id', id)
  if (error) {
    console.error('[rep-tasks] update failed:', error)
    return NextResponse.json({ error: 'Could not update the task.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE: managers only.
export async function DELETE(request: NextRequest) {
  const { email, isManager } = await whoami()
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!isManager) return NextResponse.json({ error: 'Only managers can delete tasks.' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing task id.' }, { status: 400 })

  const db = adminDb()
  const { error } = await db.from('rep_tasks').delete().eq('id', id)
  if (error) {
    console.error('[rep-tasks] delete failed:', error)
    return NextResponse.json({ error: 'Could not delete the task.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
