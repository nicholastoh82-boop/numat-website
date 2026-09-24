// lib/analytics.ts
//
// Thin wrapper over the GA4 gtag already loaded in app/layout.tsx. Uses GA4's
// recommended ecommerce event names so the funnel report works out of the box:
// view_item -> add_to_cart -> begin_checkout -> generate_lead.
// Safe to call anywhere: does nothing on the server or if gtag is blocked.

type GtagItem = {
  item_id?: string
  item_name: string
  item_variant?: string
  price?: number
  quantity?: number
}

type EventParams = {
  currency?: string
  value?: number
  items?: GtagItem[]
  [key: string]: unknown
}

export function track(event: string, params: EventParams = {}) {
  if (typeof window === 'undefined') return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag !== 'function') return
  try {
    gtag('event', event, params)
  } catch {
    // Analytics must never break the page.
  }
}
