'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { getCookieConsent } from '@/components/cookie-consent-banner'

export default function AnalyticsProvider() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)

  useEffect(() => {
    function check() {
      const consent = getCookieConsent()
      setAnalyticsEnabled(consent?.analytics === true)
    }
    check()
    window.addEventListener('numat:consent-updated', check)
    return () => window.removeEventListener('numat:consent-updated', check)
  }, [])

  if (!analyticsEnabled) return null
  return <Analytics />
}
