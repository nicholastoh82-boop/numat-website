'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ConnectGmailPage() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function connect() {
    setBusy(true)
    setErr(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes:
          'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
        redirectTo: `${window.location.origin}/portal/connect-gmail/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent', hd: 'numat.ph' },
      },
    })
    if (error) {
      setErr(error.message)
      setBusy(false)
    }
    // On success the browser redirects to Google, then back to the callback page.
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Connect Gmail for sending</h1>
      <p className="mt-3 text-sm text-gray-600">
        This lets the portal send outreach and replies from your own NUMAT inbox. Tap the button,
        pick your numat.ph account, and approve the Gmail access on the Google screen. You only do
        this once.
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Sign in as the person whose sending you want to connect. The permission is saved for whoever
        is signed in right now.
      </p>

      <button
        type="button"
        onClick={connect}
        disabled={busy}
        className="mt-6 px-4 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? 'Opening Google...' : 'Connect Gmail'}
      </button>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
    </div>
  )
}
