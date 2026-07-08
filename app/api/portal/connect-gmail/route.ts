import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { storeRepRefreshToken } from '@/lib/cron/helpers'

// Stores the Gmail refresh token that the signed in rep just granted. The token
// is always saved under the authenticated user's own email, never an email from
// the request body, so a person can only connect their own mailbox.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const email = user?.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ ok: false, error: 'You are not signed in.' }, { status: 401 })
    }
    if (!email.endsWith('@numat.ph')) {
      return NextResponse.json({ ok: false, error: 'Only numat.ph accounts can connect sending.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const refreshToken = String(body?.refresh_token ?? '').trim()
    const scope = body?.scope ? String(body.scope) : undefined

    if (!refreshToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No sending permission was captured. Please try again and be sure to approve the Gmail access on the Google screen.',
        },
        { status: 400 }
      )
    }

    await storeRepRefreshToken(email, refreshToken, email, scope)
    return NextResponse.json({ ok: true, email })
  } catch (err) {
    console.error('[connect-gmail] store failed:', err)
    return NextResponse.json({ ok: false, error: 'Could not save the connection. Please try again.' }, { status: 500 })
  }
}
