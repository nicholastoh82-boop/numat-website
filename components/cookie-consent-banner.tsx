'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'numat_cookie_consent'

export type CookieConsent = {
  analytics: boolean
  marketing: boolean
  timestamp: number
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CookieConsent) : null
  } catch {
    return null
  }
}

function saveConsent(analytics: boolean, marketing: boolean): void {
  const consent: CookieConsent = { analytics, marketing, timestamp: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  window.dispatchEvent(new CustomEvent('numat:consent-updated'))
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true)
  }, [])

  function accept(analytics: boolean, marketing: boolean) {
    saveConsent(analytics, marketing)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-stone-200 bg-[#e7e1d8]/98 px-4 py-5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-stone-700">
          We use cookies to analyse site traffic and improve your experience. By clicking{' '}
          <strong className="font-semibold text-stone-900">Accept All</strong>, you consent to
          analytics and marketing cookies. You can also choose{' '}
          <strong className="font-semibold text-stone-900">Necessary Only</strong> to use only
          essential cookies. See our{' '}
          <Link
            href="/cookies"
            className="underline underline-offset-2 hover:text-stone-900"
          >
            Cookie Policy
          </Link>{' '}
          for details.
        </p>

        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => accept(false, false)}
            className="rounded-full border border-stone-400 bg-transparent px-5 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-600 hover:text-stone-900"
          >
            Necessary Only
          </button>
          <button
            type="button"
            onClick={() => accept(true, true)}
            className="rounded-full bg-[#16361f] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e4827]"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
