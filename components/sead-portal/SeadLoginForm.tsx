'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SeadLoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const resp = await fetch('/api/sead-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Login failed')
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-bold tracking-widest text-emerald-700 mb-2">NUMAT and SEAD</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Partner Portal</h1>
          <p className="text-sm text-gray-500">Enter the access password to view qualification form submissions.</p>
        </div>
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent mb-3"
          />
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 mb-3">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-semibold rounded-md transition text-sm"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-xs text-gray-400 text-center">
          Access provided by NUMAT. Contact nick at numat.ph if you need a password reset.
        </p>
      </div>
    </div>
  )
}
