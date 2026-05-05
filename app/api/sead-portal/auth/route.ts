import { NextRequest, NextResponse } from 'next/server'

const PASSWORD = process.env.SEAD_PORTAL_PASSWORD!
const SESSION_KEY = process.env.SEAD_PORTAL_SESSION_KEY!

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = (body?.password || '').trim()

  if (!PASSWORD || !SESSION_KEY) {
    return NextResponse.json({ error: 'Portal not configured' }, { status: 500 })
  }
  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const resp = NextResponse.json({ ok: true })
  resp.cookies.set('sead_session', SESSION_KEY, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return resp
}

export async function DELETE() {
  const resp = NextResponse.json({ ok: true })
  resp.cookies.delete('sead_session')
  return resp
}
