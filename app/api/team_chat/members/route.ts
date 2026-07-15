/*
  app/api/team_chat/members/route.ts

  Returns everyone on the portal (any numat.ph account that has signed in), so
  the chat can show a teammate picker for private chats and groups. One fast
  database call through tc_portal_people, which replaces the old approach of
  downloading the entire user list through the auth admin API. The caller must
  be signed in.
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

    const { data, error } = await admin.rpc('tc_portal_people')
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const members = ((data || []) as { id: string; name: string; email: string }[]).filter(
      (m) => m.id !== user.id,
    )

    return NextResponse.json({ members })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
