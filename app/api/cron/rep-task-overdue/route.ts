import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notifyTask } from '@/lib/portal/repTaskNotify'

// Daily reminder for tasks past their due date. Notifies the assigned rep and
// copies Nick, once per task, using overdue_notified_at to avoid repeating. If a
// manager changes the due date or reassigns, that flag is reset so a fresh
// reminder can fire.
export const dynamic = 'force-dynamic'

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminDb()
  const today = new Date().toISOString().slice(0, 10)

  const { data: tasks, error } = await db
    .from('rep_tasks')
    .select('id, title, assigned_to_email, assigned_to_name, due_date, priority, description')
    .in('status', ['open', 'in_progress'])
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .is('overdue_notified_at', null)

  if (error) {
    console.error('[rep-task-overdue] load failed:', error)
    return NextResponse.json({ error: 'Load failed' }, { status: 500 })
  }

  let notified = 0
  for (const t of tasks || []) {
    try {
      await notifyTask({
        event: 'overdue',
        repEmail: t.assigned_to_email,
        repName: t.assigned_to_name,
        title: t.title,
        dueDate: t.due_date,
        priority: t.priority,
        description: t.description,
      })
      await db
        .from('rep_tasks')
        .update({ overdue_notified_at: new Date().toISOString() })
        .eq('id', t.id)
      notified++
    } catch (e) {
      console.error('[rep-task-overdue] notify failed for', t.id, e)
    }
  }

  return NextResponse.json({ ok: true, checked: (tasks || []).length, notified })
}
