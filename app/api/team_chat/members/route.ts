/*
  app/api/team_chat/members/route.ts

  Returns everyone on the portal (any numat.ph account that has signed in), so
  the chat can show a teammate picker for private chats and groups. Uses the
  service role to read names and emails from auth. The caller must be signed in.
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

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })

    const members = (list?.users || [])
      .filter((u) => (u.email || '').toLowerCase().endsWith('@numat.ph'))
      .filter((u) => u.id !== user.id)
      .map((u) => {
        const meta = (u.user_metadata || {}) as Record<string, unknown>
        const name = (meta.full_name as string) || (meta.name as string) || u.email || 'Member'
        return { id: u.id, name, email: u.email || '' }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ members })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
