/*
  app/api/portal/push/route.ts
  GET returns the public VAPID key and whether this person already has a
  subscription. POST saves a device subscription. DELETE removes one. Writes
  use the service role. Signed in numat.ph only.
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

async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user || !isNumat(user.email)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  const a = adminClient()
  const [{ data: cfg }, { count }] = await Promise.all([
    a.from('push_config').select('value').eq('key', 'vapid_public').maybeSingle(),
    a
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])
  return NextResponse.json({
    publicKey: (cfg as { value?: string } | null)?.value || '',
    subscribed: (count || 0) > 0,
  })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user || !isNumat(user.email)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  const sub = await req.json()
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Bad subscription' }, { status: 400 })
  }
  const a = adminClient()
  const { error } = await a.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      user_email: user.email || null,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: 'endpoint' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user || !isNumat(user.email)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }
  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const a = adminClient()
  await a.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
