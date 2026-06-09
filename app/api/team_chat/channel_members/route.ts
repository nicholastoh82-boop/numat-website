/*
  app/api/team_chat/channel_members/route.ts

  Returns the people who are members of one channel, with names and emails.
  Uses the service role to read names from auth. The caller must be signed in
  and must themselves be a member of the channel they are asking about.
*/

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const channelId = req.nextUrl.searchParams.get('channelId')
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
    }

    const admin = createAdmin(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: rows, error } = await admin
      .from('team_channel_members')
      .select('user_id')
      .eq('channel_id', channelId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const memberIds = new Set((rows || []).map((r) => r.user_id as string))
    if (!memberIds.has(user.id)) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const members = (list?.users || [])
      .filter((u) => memberIds.has(u.id))
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
