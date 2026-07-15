'use client'

import { useState } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

type Props = {
  /** Recorded against the subscriber so we can tell placements apart. */
  source?: string
  className?: string
  variant?: 'light' | 'dark'
}

export default function NewsletterSignup({
  source = 'website',
  className = '',
  variant = 'light',
}: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const isDark = variant === 'dark'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (state === 'loading') return

    setState('loading')
    setMessage('')

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setState('error')
        setMessage(data?.error ?? 'Could not complete the subscription.')
        return
      }

      setState('done')
      setEmail('')
      setMessage('You are on the list.')
    } catch (error) {
      console.error('Newsletter signup error:', error)
      setState('error')
      setMessage('Network error. Try again.')
    }
  }

  if (state === 'done') {
    return (
      <div
        className={`flex items-center gap-2 text-sm font-semibold ${
          isDark ? 'text-emerald-300' : 'text-emerald-800'
        } ${className}`}
      >
        <Check className="h-4 w-4" />
        {message}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
            isDark
              ? 'border-white/15 bg-white/10 text-white placeholder:text-white/40 focus:border-white/40'
              : 'border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:border-emerald-700'
          }`}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 disabled:opacity-60 ${
            isDark
              ? 'bg-white text-stone-950 hover:bg-stone-100'
              : 'bg-emerald-800 text-white hover:-translate-y-0.5 hover:bg-emerald-900'
          }`}
        >
          {state === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Subscribe
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {state === 'error' && message && (
        <p className={`mt-2 text-xs ${isDark ? 'text-red-300' : 'text-red-600'}`}>{message}</p>
      )}

      <p className={`mt-2 text-xs ${isDark ? 'text-white/50' : 'text-stone-500'}`}>
        Product updates and field notes. Unsubscribe anytime.
      </p>
    </form>
  )
}
