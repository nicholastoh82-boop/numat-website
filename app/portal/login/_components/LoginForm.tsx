/* app/portal/login/_components/LoginForm.tsx
   One button sign in with the numat.ph Google account. No password. */

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  redirectTo: string
  initialError?: string
}

export default function LoginForm({ redirectTo, initialError }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)

  async function signInWithGoogle() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const next = redirectTo || '/portal'
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { hd: 'numat.ph', prompt: 'select_account' },
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (oauthError) {
      setBusy(false)
      setError(oauthError.message)
    }
    // On success the browser is redirected to Google.
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
        className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? 'Redirecting...' : 'Continue with your numat.ph Google account'}
      </button>
      <p className="text-xs text-gray-500 text-center">
        Use your numat.ph account. No password needed.
      </p>
    </div>
  )
}
