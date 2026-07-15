import { NextRequest, NextResponse } from 'next/server'
import { upsertSubscriber } from '@/lib/newsletter'

// Public opt-in endpoint for the website newsletter signup.
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }

  const email = String(body.email || '').trim().toLowerCase()
  const firstName = body.firstName ? String(body.firstName) : undefined
  const source = body.source ? String(body.source) : 'website'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  try {
    await upsertSubscriber(email, firstName, source)
    return NextResponse.json({ ok: true, message: 'You are subscribed. Thank you.' })
  } catch {
    return NextResponse.json({ error: 'Could not subscribe right now. Please try again later.' }, { status: 500 })
  }
}
