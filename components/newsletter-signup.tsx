'use client'

import { useState } from 'react'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async () => {
    if (state === 'loading') return
    setState('loading')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setState('done')
      setMessage(data.message || 'You are subscribed. Thank you.')
      setEmail('')
    } catch (e: any) {
      setState('error')
      setMessage(e.message)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <p className="text-sm font-semibold mb-1">Stay updated</p>
      <p className="text-xs opacity-80 mb-3">
        Product news and updates from NUMAT. No spam, unsubscribe anytime.
      </p>
      {state === 'done' ? (
        <p className="text-sm text-green-300">{message}</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="your@email.com"
            aria-label="Email address"
            className="flex-1 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
          />
          <button
            type="button"
            onClick={submit}
            disabled={state === 'loading'}
            className="rounded bg-green-600 hover:bg-green-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {state === 'loading' ? '...' : 'Subscribe'}
          </button>
        </div>
      )}
      {state === 'error' && <p className="mt-2 text-xs text-red-300">{message}</p>}
    </div>
  )
}
