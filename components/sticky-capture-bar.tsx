'use client'

import { useState, useEffect } from 'react'
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
      setTimeout(() => setDismissed(true), 4000)
    } catch {
      setStatus('error')
    }
  }

  // hidden md:block — only renders visually on desktop
  // dismissed/not yet visible — render nothing
  if (!visible || dismissed) return null

  return (
    <div className="hidden md:block" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}>
      {/* Attention accent line */}
      <div style={{ height: '3px', background: 'linear-gradient(to right, #059669, #06b6d4, #059669)' }} />

      <div style={{ background: '#0f1e12', borderTop: '1px solid rgba(5,150,105,0.4)', boxShadow: '0 -4px 32px rgba(0,0,0,0.5)' }}>
        <div
          style={{
            maxWidth: '80rem',
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {status === 'success' ? (
            <p style={{ flex: 1, textAlign: 'center', color: '#34d399', fontWeight: 600, fontSize: '14px' }}>
              ✓ Received! We'll reach out within 24 hours.
            </p>
          ) : (
            <>
              <p style={{ color: '#6ee7b7', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                🌿 Free sample or quote →
              </p>

              <div style={{ display: 'flex', flex: 1, gap: '8px', minWidth: 0 }}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{
                    flex: '1 1 120px', minWidth: 0, padding: '9px 12px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: '14px', outline: 'none',
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
                    flex: '1 1 140px', minWidth: 0, padding: '9px 12px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: '14px', outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#059669')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                />
                <select
                  value={form.interest}
                  onChange={e => setForm(f => ({ ...f, interest: e.target.value }))}
                  style={{
                    padding: '9px 12px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="sample" style={{ background: '#0f1e12' }}>🌿 Free Sample</option>
                  <option value="quote" style={{ background: '#0f1e12' }}>📋 Get Quote</option>
                </select>
                <button
                  onClick={handleSubmit}
                  disabled={status === 'loading' || !form.name || !form.email}
                  style={{
                    padding: '9px 20px', borderRadius: '10px', background: '#059669',
                    color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    opacity: (!form.name || !form.email) ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (form.name && form.email) (e.target as HTMLElement).style.background = '#047857' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = '#059669' }}
                >
                  {status === 'loading' ? '...' : 'Submit →'}
                </button>
              </div>

              {status === 'error' && (
                <p style={{ color: '#f87171', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  Something went wrong.
                </p>
              )}
            </>
          )}

          <button
            onClick={() => setDismissed(true)}
            style={{ color: 'rgba(255,255,255,0.3)', fontSize: '22px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, flexShrink: 0, padding: '0 4px' }}
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

  return createPortal(<CaptureBarContent />, document.body)
}