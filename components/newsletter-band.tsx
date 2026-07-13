'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

export default function NewsletterBand() {
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
    <section className="border-y border-stone-200 bg-[#f6f1e8]">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
              Newsletter
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Stay updated
            </h2>
            <p className="mt-3 text-base leading-7 text-stone-600">
              Product news, new engineered bamboo materials, and updates from NUMAT,
              straight to your inbox. No spam, and you can unsubscribe anytime.
            </p>
          </div>

          <div className="lg:justify-self-end lg:w-full lg:max-w-md">
            {state === 'done' ? (
              <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-medium text-emerald-800">
                {message}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="your@email.com"
                    aria-label="Email address"
                    className="flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={submit}
                    disabled={state === 'loading'}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-900 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {state === 'loading' ? 'Subscribing...' : 'Subscribe'}
                    {state !== 'loading' && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
                {state === 'error' && (
                  <p className="mt-2 text-xs font-medium text-red-600">{message}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
