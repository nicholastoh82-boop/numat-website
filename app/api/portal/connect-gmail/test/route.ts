import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGmail, repKeyForEmail } from '@/lib/cron/helpers'

// Sends a small test email as the signed in rep, to themselves, proving that the
// connected token actually works with the sending pipeline. Any failure here
// (for example a mismatched OAuth client) surfaces as a clear message.
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const email = user?.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ ok: false, error: 'You are not signed in.' }, { status: 401 })
    }

    const rep = repKeyForEmail(email)
    if (!rep) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Your account is not set up as a sending rep yet, so there is nothing to test. The connection was still saved.',
        },
        { status: 200 }
      )
    }

    await sendGmail({
      from: rep,
      to: email,
      subject: 'NUMAT sending test',
      text: 'This is a test. If you received this, your Gmail is connected for sending from the portal.',
    })

    return NextResponse.json({ ok: true, sentTo: email })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[connect-gmail] test send failed:', message)
    return NextResponse.json(
      {
        ok: false,
        error:
          'The connection saved, but the test send failed. This usually means the Google app that signs you in is not the same one the sender uses. Details: ' +
          message,
      },
      { status: 200 }
    )
  }
}
