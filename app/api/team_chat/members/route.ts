/*
  app/api/team_chat/members/route.ts

  Returns the list of people who have portal access, so the chat can show a
  teammate picker for private chats. Uses the service role to read names and
  emails from auth, filtered to anyone who has a role in user_roles. The
  caller must be signed in.
*/

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const admin = createAdmin(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: roleRows } = await admin.from('user_roles').select('user_id')
    const ids = Array.from(
      new Set(((roleRows || []) as { user_id: string }[]).map((r) => r.user_id)),
    )
    if (ids.length === 0) return NextResponse.json({ members: [] })

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const byId = new Map((list?.users || []).map((u) => [u.id, u]))

    const members = ids
      .map((id) => {
        const u = byId.get(id)
        if (!u) return null
        const meta = (u.user_metadata || {}) as Record<string, unknown>
        const name =
          (meta.full_name as string) || (meta.name as string) || u.email || 'Member'
        return { id, name, email: u.email || '' }
      })
      .filter((m): m is { id: string; name: string; email: string } => !!m)
      .filter((m) => m.id !== user.id)
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ members })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
