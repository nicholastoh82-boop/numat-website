import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Deliberately permissive but structural. Anything that passes this still has to
// clear the unique constraint on the table.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Newsletter subscribe: missing Supabase environment variables.')
    return NextResponse.json({ error: 'Subscription is unavailable right now.' }, { status: 500 })
  }

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const payload = body as {
    email?: unknown
    first_name?: unknown
    source?: unknown
  }

  const email =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''

  if (!email || !EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const firstName =
    typeof payload.first_name === 'string' && payload.first_name.trim()
      ? payload.first_name.trim().slice(0, 120)
      : null

  const source =
    typeof payload.source === 'string' && payload.source.trim()
      ? payload.source.trim().slice(0, 60)
      : 'website'

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Upsert on the unique email. A returning subscriber who previously opted out
  // is flipped back to subscribed rather than erroring on the constraint.
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      {
        email,
        first_name: firstName,
        source,
        status: 'subscribed',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )

  if (error) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json({ error: 'Could not complete the subscription.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Subscribed.' }, { status: 200 })
}
