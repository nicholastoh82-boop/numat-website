'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Delegates to the canonical Gmail connect flow (/api/gmail/auth), which uses the
// correct OAuth client, stores the token in rep_gmail_tokens keyed by rep_email,
// and is what the sending and sync paths read. After Google, it returns to /crm.
export default function ConnectGmailPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!cancelled) {
        setEmail(user?.email ?? null)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function connect() {
    if (!email) return
    setBusy(true)
    window.location.href = `/api/gmail/auth?rep_email=${encodeURIComponent(email)}`
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Connect Gmail for sending</h1>
      <p className="mt-3 text-sm text-gray-600">
        This lets the portal send outreach and replies from your own NUMAT inbox. Tap the button,
        pick your numat.ph account, and approve the access on the Google screen. You only do this
        once.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading...</p>
      ) : email ? (
        <>
          <p className="mt-2 text-sm text-gray-500">Connecting the mailbox for {email}.</p>
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="mt-6 px-4 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? 'Opening Google...' : 'Connect Gmail'}
          </button>
        </>
      ) : (
        <p className="mt-6 text-sm text-red-600">You are not signed in. Please sign in and try again.</p>
      )}
    </div>
  )
}
