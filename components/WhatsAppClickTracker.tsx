'use client'

import { useEffect } from 'react'

/* Catches clicks on any WhatsApp link anywhere on the site (a delegated listener,
   so individual links do not need changing). On a click it fires a Google
   Analytics event and sends a small beacon to record the click. Best effort:
   it never blocks navigation and never throws. */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function isWhatsAppHref(href: string | null): boolean {
  if (!href) return false
  return /wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(href)
}

export default function WhatsAppClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!isWhatsAppHref(href)) return

      const path = window.location.pathname + window.location.search

      try {
        window.gtag?.('event', 'whatsapp_click', {
          event_category: 'engagement',
          event_label: path,
        })
      } catch {
        // ignore analytics failure
      }

      try {
        const payload = JSON.stringify({ path, href })
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/track/whatsapp-click', new Blob([payload], { type: 'application/json' }))
        } else {
          fetch('/api/track/whatsapp-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        // ignore beacon failure
      }
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  return null
}
