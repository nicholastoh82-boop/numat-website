import { NextRequest, NextResponse } from 'next/server'
import { subscribeContact } from '@/lib/newsletter'

// Public opt-in endpoint for the website newsletter signup form.
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const firstName = body.firstName ? String(body.firstName) : undefined

  // Basic email shape check.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  try {
    await subscribeContact(email, firstName)
    return NextResponse.json({ ok: true, message: 'You are subscribed. Thank you.' })
  } catch (err: any) {
    // Duplicate contact: treat as success so the form is not confusing.
    const msg = String(err?.message || '')
    if (/already exists|duplicate/i.test(msg)) {
      return NextResponse.json({ ok: true, message: 'You are already subscribed.' })
    }
    return NextResponse.json(
      { error: 'Could not subscribe right now. Please try again later.' },
      { status: 500 },
    )
  }
}
