/*
  app/api/portal/access/route.ts

  Admin only. GET returns every numat.ph person with the functions they can see.
  POST turns one function on or off for one person. All writes use the service
  role; only an admin caller is allowed.
*/

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const ALWAYS_ADMIN = ['nick@numat.ph']

const FEATURES: { key: string; label: string }[] = [
  { key: 'chat', label: 'Team Chat' },
  { key: 'scoreboard', label: 'NuBam Hybrid' },
  { key: 'crm', label: 'CRM' },
  { key: 'ceo', label: 'CEO View' },
  { key: 'financials', label: 'Financials' },
  { key: 'reports', label: 'Reports' },
  { key: 'receipts', label: 'Receipts' },
  { key: 'verify', label: 'Verify' },
  { key: 'production', label: 'Production' },
  { key: 'productivity', label: 'Email Counter' },
  { key: 'lead_timeline', label: 'Lead Status' },
  { key: 'announcements', label: 'Announcements' },
]
const FEATURE_KEYS = new Set(FEATURES.map((f) => f.key))

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function callerIsAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const email = (user.email || '').toLowerCase()
  if (ALWAYS_ADMIN.includes(email)) return user
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
  if (data && data.length > 0) return user
  return null
}

export async function GET() {
  const caller = await callerIsAdmin()
  if (!caller) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const a = adminClient()
  const { data: list } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const numatUsers = (list?.users || []).filter((u) =>
    (u.email || '').toLowerCase().endsWith('@numat.ph'),
  )

  const { data: accessRows } = await a.from('portal_access').select('user_id, feature')
  const { data: adminRoleRows } = await a.from('user_roles').select('user_id').eq('role', 'admin')
  const adminIds = new Set(((adminRoleRows || []) as { user_id: string }[]).map((r) => r.user_id))

  const featByUser = new Map<string, string[]>()
  for (const r of (accessRows || []) as { user_id: string; feature: string }[]) {
    const arr = featByUser.get(r.user_id) || []
    arr.push(r.feature)
    featByUser.set(r.user_id, arr)
  }

  const users = numatUsers
    .map((u) => {
      const email = (u.email || '').toLowerCase()
      const meta = (u.user_metadata || {}) as Record<string, unknown>
      const name = (meta.full_name as string) || (meta.name as string) || u.email || 'Member'
      const isAdmin = adminIds.has(u.id) || ALWAYS_ADMIN.includes(email)
      return { id: u.id, name, email: u.email || '', isAdmin, features: featByUser.get(u.id) || [] }
    })
    .sort((x, y) => x.name.localeCompare(y.name))

  return NextResponse.json({ features: FEATURES, users })
}

export async function POST(req: NextRequest) {
  const caller = await callerIsAdmin()
  if (!caller) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { userId, feature, allowed } = await req.json()
  if (!userId || !FEATURE_KEYS.has(feature)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const a = adminClient()
  if (allowed) {
    await a
      .from('portal_access')
      .upsert({ user_id: userId, feature }, { onConflict: 'user_id,feature', ignoreDuplicates: true })
  } else {
    await a.from('portal_access').delete().eq('user_id', userId).eq('feature', feature)
  }
  return NextResponse.json({ ok: true })
}
