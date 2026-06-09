/*
  app/api/team_chat/channel_members/route.ts

  Returns the people who are members of one channel, with names and emails.
  One fast database call through tc_channel_people, which replaces the old
  approach of two queries plus downloading the entire user list through the
  auth admin API. The function only returns rows when the caller is themselves
  a member of the channel, and a member always appears in their own channel,
  so an empty result means the caller is not a member.
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

    const { data, error } = await admin.rpc('tc_channel_people', {
      p_channel: channelId,
      p_requester: user.id,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const members = (data || []) as { id: string; name: string; email: string }[]
    if (members.length === 0) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    return NextResponse.json({ members })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
