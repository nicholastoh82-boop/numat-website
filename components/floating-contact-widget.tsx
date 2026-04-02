'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircleMore, PackageCheck, Leaf } from 'lucide-react'

declare const gtag: (...args: unknown[]) => void

const whatsappUrl = `https://wa.me/60162958983?text=${encodeURIComponent(
  'Hello NUMAT, I would like to request product information and a quotation.'
)}`

function MiniCaptureForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', interest: 'sample' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async () => {
    if (!form.name || !form.email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'mobile_floating' }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      if (typeof window !== 'undefined' && (window as any).gtag) {
        ;(window as any).gtag('event', 'lead_capture', {
          event_category: 'engagement',
          event_label: form.interest,
          source: 'mobile_floating',
        })
      }
      setTimeout(onClose, 3000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="w-64 rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: '#0f1e12', border: '1px solid rgba(5,150,105,0.4)' }}
    >
      <div style={{ height: '2px', background: 'linear-gradient(to right, #059669, #06b6d4)' }} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6ee7b7' }}>
            Quick Request
          </p>
          <button
            onClick={onClose}
            style={{
              color: 'rgba(255,255,255,0.4)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
              padding: 0,
            }}
          >
            x
          </button>
        </div>

        {status === 'success' ? (
          <p className="text-sm text-center py-3" style={{ color: '#34d399' }}>
            Got it! We will reach out within 24 hours.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full text-sm text-white placeholder-white/40 rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
              onFocus={e => (e.target.style.borderColor = '#059669')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
            />
            <input
              type="email"
              placeholder="Work email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full text-sm text-white placeholder-white/40 rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
              onFocus={e => (e.target.style.borderColor = '#059669')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
            />
            <div className="flex gap-2">
              {(['sample', 'quote'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setForm(f => ({ ...f, interest: opt }))}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: form.interest === opt ? '#059669' : 'transparent',
                    border: `1px solid ${form.interest === opt ? '#059669' : 'rgba(255,255,255,0.2)'}`,
                    color: form.interest === opt ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  {opt === 'sample' ? 'Free Sample' : 'Get Quote'}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={status === 'loading' || !form.name || !form.email}
              className="w-full py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#059669', border: 'none', cursor: 'pointer' }}
            >
              {status === 'loading' ? 'Sending...' : 'Submit'}
            </button>
            {status === 'error' && (
              <p className="text-xs text-center" style={{ color: '#f87171' }}>
                Something went wrong. Try again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FloatingContactWidget() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="fixed right-5 bottom-5 md:bottom-16 z-[80] flex flex-col items-end gap-3">

      {showForm && (
        <div className="md:hidden">
          <MiniCaptureForm onClose={() => setShowForm(false)} />
        </div>
      )}

      <Link
        href="/request-samples"
        aria-label="Request Samples"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 sm:h-auto sm:w-auto sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3"
      >
        <PackageCheck className="h-5 w-5 shrink-0 text-white" />
        <span className="hidden text-sm font-semibold text-white sm:inline">Request Samples</span>
      </Link>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 sm:h-auto sm:w-auto sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3"
        onClick={() =>
          gtag('event', 'whatsapp_click', {
            event_category: 'engagement',
            event_label: 'Floating Widget',
          })
        }
      >
        <MessageCircleMore className="h-5 w-5 shrink-0 text-white" />
        <span className="hidden text-sm font-semibold text-white sm:inline">WhatsApp Sales</span>
      </a>

      <button
        onClick={() => setShowForm(s => !s)}
        aria-label="Get a sample or quote"
        className="md:hidden flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition duration-200 hover:-translate-y-0.5"
        style={{
          background: showForm ? '#047857' : '#059669',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Leaf className="h-5 w-5" />
      </button>

    </div>
  )
}