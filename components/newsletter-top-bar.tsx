'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'numat_newsletter_bar_dismissed'
const HIDE_ON = ['/admin', '/crm', '/finance', '/portal', '/board', '/investors', '/sead-portal', '/auth', '/unsubscribe']

export default function NewsletterTopBar() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) !== '1') setShow(true)
    } catch {
      setShow(true)
    }
  }, [])

  if (!show) return null
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null

  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

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
      setMessage(data.message || 'Subscribed. Thank you.')
      try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
      setTimeout(() => setShow(false), 2500)
    } catch (e: any) {
      setState('error')
      setMessage(e.message)
    }
  }

  return (
    <div className="relative z-[60] bg-[#16361f] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        {state === 'done' ? (
          <p className="text-sm font-medium text-emerald-100">{message}</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              <span aria-hidden="true">✦ </span>
              Get NUMAT product news and updates in your inbox
            </p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="your@email.com"
                aria-label="Email address"
                className="w-44 rounded-md border border-white/20 bg-white/95 px-3 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-white sm:w-52"
              />
              <button
                type="button"
                onClick={submit}
                disabled={state === 'loading'}
                className="whitespace-nowrap rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {state === 'loading' ? '...' : 'Subscribe'}
              </button>
            </div>
            {state === 'error' && (
              <p className="w-full text-center text-xs text-red-200 sm:w-auto">{message}</p>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
