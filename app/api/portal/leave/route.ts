/*
  app/api/portal/leave/route.ts
  POST creates a leave request for the signed in person.
  PATCH approves or rejects a request and is admin only.
  Writes use the service role.
*/

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const ALWAYS_ADMIN = ['nick@numat.ph']
const LEAVE_TYPES = new Set(['annual', 'sick', 'unpaid', 'other'])

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function getCaller() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

function isNumat(email?: string | null) {
  return !!email && email.toLowerCase().endsWith('@numat.ph')
}

async function callerIsAdmin(
  user: { id: string; email?: string | null } | null,
): Promise<boolean> {
  if (!user) return false
  const email = (user.email || '').toLowerCase()
  if (ALWAYS_ADMIN.includes(email)) return true
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
  return !!(data && data.length > 0)
}

export async function POST(req: NextRequest) {
  const user = await getCaller()
  if (!user || !isNumat(user.email)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { leaveType, startDate, endDate, reason } = await req.json()
  if (!LEAVE_TYPES.has(leaveType)) {
    return NextResponse.json({ error: 'Pick a leave type' }, { status: 400 })
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Pick the dates' }, { status: 400 })
  }
  if (String(endDate) < String(startDate)) {
    return NextResponse.json({ error: 'End date cannot be before the start date' }, { status: 400 })
  }

  const a = adminClient()
  const { error } = await a.from('leave_requests').insert({
    user_id: user.id,
    user_email: user.email || null,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
    status: 'pending',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const user = await getCaller()
  if (!(await callerIsAdmin(user))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }

  const { id, decision } = await req.json()
  if (!id || (decision !== 'approved' && decision !== 'rejected')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const a = adminClient()
  const { error } = await a
    .from('leave_requests')
    .update({
      status: decision,
      decided_by: user!.id,
      decided_by_email: user!.email || null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
