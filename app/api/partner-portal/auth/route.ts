import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getConfig(key: string): Promise<string | null> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data } = await sb.from('config_kv').select('value').eq('key', key).maybeSingle()
  const v = data ? (data as { value: unknown }).value : null
  return typeof v === 'string' ? v : null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = (body?.password || '').trim()
  const real = await getConfig('partner_portal_password')
  const sessionKey = await getConfig('partner_portal_session_key')
  if (!real || !sessionKey) return NextResponse.json({ error: 'Portal not configured' }, { status: 500 })
  if (password !== real) return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  const resp = NextResponse.json({ ok: true })
  resp.cookies.set('partner_session', sessionKey, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  return resp
}

export async function DELETE() {
  const resp = NextResponse.json({ ok: true })
  resp.cookies.delete('partner_session')
  return resp
}
