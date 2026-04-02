'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function CaptureBarContent() {
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', interest: 'sample' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (dismissed) return
    const timer = setTimeout(() => setVisible(true), 6000)
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
      // Auto-dismiss after 4s on success
      setTimeout(() => setDismissed(true), 4000)
    } catch {
      setStatus('error')
    }
  }

  if (!visible || dismissed) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        // iOS safe area (home bar)
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Attention accent line */}
      <div style={{ height: '3px', background: 'linear-gradient(to right, #059669, #06b6d4, #059669)' }} />

      <div
        style={{
          background: '#0f1e12',
          borderTop: '1px solid rgba(5,150,105,0.4)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            maxWidth: '80rem',
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {status === 'success' ? (
            <p style={{ flex: 1, textAlign: 'center', color: '#34d399', fontWeight: 600, fontSize: '14px', padding: '4px 0' }}>
              ✓ Received! We'll reach out within 24 hours.
            </p>
          ) : (
            <>
              {/* Label — hidden on small mobile to save space */}
              <p
                style={{ color: '#6ee7b7', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
                className="hidden sm:block"
              >
                🌿 Free sample or quote →
              </p>

              {/* Inputs */}
              <div style={{ display: 'flex', flex: 1, gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{
                    flex: '1 1 120px',
                    minWidth: 0,
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#059669')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                />
                <input
                  type="email"
                  placeholder="Work email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{
                    flex: '1 1 140px',
                    minWidth: 0,
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#059669')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                />
                <select
                  value={form.interest}
                  onChange={e => setForm(f => ({ ...f, interest: e.target.value }))}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <option value="sample" style={{ background: '#0f1e12' }}>🌿 Free Sample</option>
                  <option value="quote" style={{ background: '#0f1e12' }}>📋 Get Quote</option>
                </select>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={status === 'loading' || !form.name || !form.email}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  background: status === 'loading' ? '#065f46' : '#059669',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  opacity: (!form.name || !form.email) ? 0.5 : 1,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { if (form.name && form.email) (e.target as HTMLElement).style.background = '#047857' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = '#059669' }}
              >
                {status === 'loading' ? '...' : 'Submit →'}
              </button>

              {status === 'error' && (
                <p style={{ width: '100%', textAlign: 'center', color: '#f87171', fontSize: '12px' }}>
                  Something went wrong — please try again.
                </p>
              )}
            </>
          )}

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 1,
              flexShrink: 0,
              padding: '0 4px',
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StickyCaptureBar() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Portal renders directly into document.body, bypassing any parent
  // CSS transforms that break position:fixed on mobile
  return createPortal(<CaptureBarContent />, document.body)
}