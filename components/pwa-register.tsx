'use client'

import { useEffect } from 'react'

// Registers the service worker and, when the app is launched in installed mode,
// forces it onto the portal instead of the public site.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isInstalledApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    // If the installed app opened on the public home page, send it to the portal.
    if (isInstalledApp && window.location.pathname === '/') {
      window.location.replace('/portal')
      return
    }

    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Ignore registration errors so they never block the app.
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
