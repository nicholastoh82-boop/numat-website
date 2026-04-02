'use client'

import { useState, useEffect } from 'react'

export default function StickyCaptureBar() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', interest: 'sample' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (dismissed) return
    const timer = setTimeout(() => setVisible(true), 6000) // show after 6s
    return () => clearTimeout(timer)
  }, [dismissed])

  const handleSubmit = async () => {
    if (!form.name || !form.email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'sticky_bar' }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      if (typeof window !== 'undefined' && (window as any).gtag) {
        ;(window as any).gtag('event', 'lead_capture', {
          event_category: 'engagement',
          event_label: form.interest,
          source: 'sticky_bar',
        })
      }
    } catch {
      setStatus('error')
    }
  }

  if (!visible || dismissed) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
      style={{ background: '#0d1b2a', borderTop: '1px solid rgba(6,182,212,0.3)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3">

        {status === 'success' ? (
          <p className="flex-1 text-center text-sm font-medium" style={{ color: '#06b6d4' }}>
            ✓ Got it! We'll reach out within 24 hours.
          </p>
        ) : (
          <>
            <p className="text-white text-sm font-semibold whitespace-nowrap hidden md:block">
              🌿 Get a free sample or quote
            </p>
            <div className="flex flex-1 gap-2 w-full flex-wrap sm:flex-nowrap">
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="flex-1 min-w-0 px-3 py-2 rounded-md text-sm text-white placeholder-white/40 focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                onFocus={e => (e.target.style.borderColor = '#06b6d4')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
              <input
                type="email"
                placeholder="Work email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="flex-1 min-w-0 px-3 py-2 rounded-md text-sm text-white placeholder-white/40 focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                onFocus={e => (e.target.style.borderColor = '#06b6d4')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
              <select
                value={form.interest}
                onChange={e => setForm(f => ({ ...f, interest: e.target.value }))}
                className="px-3 py-2 rounded-md text-sm text-white focus:outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <option value="sample" style={{ background: '#0d1b2a' }}>🌿 Free Sample</option>
                <option value="quote" style={{ background: '#0d1b2a' }}>📋 Get Quote</option>
              </select>
              <button
                onClick={handleSubmit}
                disabled={status === 'loading' || !form.name || !form.email}
                className="px-5 py-2 rounded-md text-white text-sm font-semibold transition-colors whitespace-nowrap disabled:opacity-50"
                style={{ background: '#06b6d4' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.background = '#0891b2')}
                onMouseLeave={e => ((e.target as HTMLElement).style.background = '#06b6d4')}
              >
                {status === 'loading' ? '...' : 'Submit →'}
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="text-white/30 hover:text-white transition-colors text-xl leading-none flex-shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      {status === 'error' && (
        <p className="text-center text-xs pb-2" style={{ color: '#f87171' }}>
          Something went wrong — please try again.
        </p>
      )}
    </div>
  )
}