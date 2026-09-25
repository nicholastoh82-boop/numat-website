'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { track } from '@/lib/analytics'

/**
 * Shown on a product page when the selected board has no published price yet
 * (for example NuForm Lite). Turns "Price on request" into a lead: the request
 * goes to /api/capture-lead, which alerts Nick, Bryan and Erica and adds a row
 * to the website tab of the sales tracker.
 */
export default function PriceRequestForm({ productLabel, quantity }: { productLabel: string; quantity: number }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter your name and a valid email.')
      return
    }
    setError('')
    setStatus('sending')
    try {
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          interest: `Price request: ${quantity} x ${productLabel}`,
          source: 'price-request',
        }),
      })
      if (!res.ok) throw new Error('failed')
      track('generate_lead', { lead_type: 'price_request', item_name: productLabel })
      setStatus('sent')
    } catch {
      setStatus('error')
      setError('Something went wrong. Please try again or message us on WhatsApp.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Thank you. We will send the price for {productLabel} to {email} within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-stone-900">Get the price for {productLabel}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Work email"
          aria-label="Work email"
          className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder="Mobile or WhatsApp (optional)"
          aria-label="Mobile or WhatsApp (optional)"
          className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 sm:col-span-2"
        />
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
      >
        {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send me the price
      </button>
    </form>
  )
}
