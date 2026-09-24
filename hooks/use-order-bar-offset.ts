'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Product pages show a fixed "Add to order" bar below 1024px wide. Floating
 * buttons add this many pixels to their bottom offset so they sit above it
 * instead of covering the order button.
 */
export function useOrderBarOffset(): number {
  const pathname = usePathname()
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return narrow && (pathname ?? '').startsWith('/products/') ? 80 : 0
}
