/*
  app/api/portal/push/test/route.ts
  Sends a test notification to the signed in person, so they can confirm push
  works on this device.
*/

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyUsers } from '@/lib/portal/push'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !(user.email || '').toLowerCase().endsWith('@numat.ph')) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  await notifyUsers({
    userIds: [user.id],
    title: 'Test notification',
    body: 'Push is working on this device.',
    url: '/portal',
  })
  return NextResponse.json({ ok: true })
}
