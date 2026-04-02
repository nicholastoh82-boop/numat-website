'use client'

import { useState } from 'react'

export default function HeroLeadCapture() {
  const [form, setForm] = useState({ name: '', company: '', email: '', interest: 'sample' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async () => {
    if (!form.name || !form.email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'hero_form' }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      if (typeof window !== 'undefined' && (window as any).gtag) {
        ;(window as any).gtag('event', 'lead_capture', {
          event_category: 'engagement',
          event_label: form.interest,
          source: 'hero_form',
        })
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="rounded-xl p-6 text-center w-full max-w-md"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6,182,212,0.4)' }}
      >
        <div className="text-4xl mb-3">🌿</div>
        <p className="font-semibold text-lg" style={{ color: '#06b6d4' }}>You're on the list!</p>
        <p className="text-sm mt-1 text-white/60">We'll reach out within 24 hours.</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-5 sm:p-6 w-full max-w-md"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
    >
      <p className="text-white text-xs font-semibold uppercase tracking-widest mb-4 opacity-80">
        Request a Sample or Quote
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Your name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            onFocus={e => (e.target.style.borderColor = '#06b6d4')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
          />
          <input
            type="text"
            placeholder="Company"
            value={form.company}
            onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            onFocus={e => (e.target.style.borderColor = '#06b6d4')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
          />
        </div>

        <input
          type="email"
          placeholder="Work email *"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
          onFocus={e => (e.target.style.borderColor = '#06b6d4')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
        />

        {/* Toggle: Sample vs Quote */}
        <div className="flex gap-2">
          {(['sample', 'quote'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setForm(f => ({ ...f, interest: opt }))}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: form.interest === opt ? '#06b6d4' : 'transparent',
                border: `1px solid ${form.interest === opt ? '#06b6d4' : 'rgba(255,255,255,0.2)'}`,
                color: form.interest === opt ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {opt === 'sample' ? '🌿 Free Sample' : '📋 Get Quote'}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={status === 'loading' || !form.name || !form.email}
          className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#06b6d4' }}
          onMouseEnter={e => ((e.target as HTMLElement).style.background = '#0891b2')}
          onMouseLeave={e => ((e.target as HTMLElement).style.background = '#06b6d4')}
        >
          {status === 'loading' ? 'Sending...' : 'Submit →'}
        </button>

        {status === 'error' && (
          <p className="text-xs text-center" style={{ color: '#f87171' }}>
            Something went wrong. Please try again.
          </p>
        )}

        <p className="text-xs text-center opacity-30 text-white">
          No spam — we'll only contact you about your request.
        </p>
      </div>
    </div>
  )
}