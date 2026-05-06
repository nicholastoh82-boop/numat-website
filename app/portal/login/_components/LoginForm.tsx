/* app/portal/login/_components/LoginForm.tsx
   Client component. Email + password sign in.
   After auth, looks up user_roles and rejects users with no role assigned. */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  redirectTo: string
  initialError?: string
}

export default function LoginForm({ redirectTo, initialError }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const supabase = createClient()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError || !data.user) {
      setBusy(false)
      setError(signInError?.message ?? 'Sign in failed.')
      return
    }

    // Verify the user actually has a portal role before letting them in.
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)

    if (!roles || roles.length === 0) {
      await supabase.auth.signOut()
      setBusy(false)
      setError('Your account has no portal access. Ask Nick to assign a role.')
      return
    }

    router.replace(redirectTo)
    router.refresh()
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email first, then click Forgot password.')
      return
    }
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback` },
    )
    setBusy(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setError('Password reset email sent. Check your inbox.')
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-gray-900 text-white text-sm font-medium py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? 'Signing in' : 'Sign in'}
      </button>

      <button
        type="button"
        onClick={handleForgotPassword}
        disabled={busy}
        className="w-full text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
      >
        Forgot password
      </button>
    </form>
  )
}
