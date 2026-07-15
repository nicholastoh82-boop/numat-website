/*
  app/api/portal/attendance/route.ts
  POST records a clock in or clock out for the signed in person, with location
  when the device shares it. Writes use the service role.
*/

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function isNumat(email?: string | null) {
  return !!email && email.toLowerCase().endsWith('@numat.ph')
}

function num(v: unknown): number | null {
  return typeof v === 'number' && isFinite(v) ? v : null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isNumat(user.email)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { eventType, latitude, longitude, accuracy } = await req.json()
  if (eventType !== 'in' && eventType !== 'out') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const a = adminClient()
  const { error } = await a.from('clock_events').insert({
    user_id: user.id,
    user_email: user.email || null,
    event_type: eventType,
    latitude: num(latitude),
    longitude: num(longitude),
    accuracy: num(accuracy),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
