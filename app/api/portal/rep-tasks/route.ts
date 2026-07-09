import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notifyTask } from '@/lib/portal/repTaskNotify'

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

  // Notify the assigned rep, and copy Nick. Best effort (the helper never throws).
  await notifyTask({
    event: 'assigned',
    repEmail: assignedTo,
    repName: assignedName,
    title,
    dueDate: body?.due_date || null,
    priority: ['low', 'normal', 'high'].includes(body?.priority) ? body.priority : 'normal',
    description: body?.description ? String(body.description).trim() : null,
    actorLabel: me?.name || email.split('@')[0],
  })

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
    .select('assigned_to_email, title, due_date, priority, description')
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

  let reassignedTo: { email: string; name: string } | null = null

  // Only managers may edit the rest of the fields or reassign.
  if (isManager) {
    if (typeof body?.title === 'string' && body.title.trim()) patch.title = body.title.trim()
    if (typeof body?.description === 'string') patch.description = body.description.trim() || null
    if (['low', 'normal', 'high'].includes(body?.priority)) patch.priority = body.priority
    if (body?.due_date !== undefined) {
      patch.due_date = body.due_date || null
      // Due date changed, so let an overdue reminder fire again later if needed.
      patch.overdue_notified_at = null
    }
    if (typeof body?.assigned_to_email === 'string' && body.assigned_to_email.trim()) {
      const newAssignee = body.assigned_to_email.toLowerCase().trim()
      if (newAssignee !== String(task.assigned_to_email).toLowerCase()) {
        const { data: a } = await db
          .from('crm_users')
          .select('name, rep_assigned_name')
          .eq('email', newAssignee)
          .maybeSingle()
        const newName = a?.rep_assigned_name || a?.name || newAssignee.split('@')[0]
        patch.assigned_to_email = newAssignee
        patch.assigned_to_name = newName
        patch.overdue_notified_at = null // new owner, reset the overdue clock
        reassignedTo = { email: newAssignee, name: newName }
      }
    }
  }

  const { error } = await db.from('rep_tasks').update(patch).eq('id', id)
  if (error) {
    console.error('[rep-tasks] update failed:', error)
    return NextResponse.json({ error: 'Could not update the task.' }, { status: 500 })
  }

  // Notify the new rep on a reassignment (and copy Nick).
  if (reassignedTo) {
    const { data: me } = await db.from('crm_users').select('name').eq('email', email).maybeSingle()
    await notifyTask({
      event: 'reassigned',
      repEmail: reassignedTo.email,
      repName: reassignedTo.name,
      title: (patch.title as string) || task.title,
      dueDate: (body?.due_date !== undefined ? body.due_date : task.due_date) || null,
      priority: (patch.priority as string) || task.priority,
      description: (body?.description !== undefined ? body.description : task.description) || null,
      actorLabel: me?.name || email.split('@')[0],
    })
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
