'use client'

import { usePathname } from 'next/navigation'
import FloatingContactWidget from '@/components/floating-contact-widget'
import ChatWidget from '@/components/chat-widget'
import StickyCaptureBar from '@/components/sticky-capture-bar'

const PRIVATE_PATHS = ['/admin', '/crm', '/finance', '/portal', '/board', '/investors', '/sead-portal']
// Pages that already carry their own order bar or checkout form: the enquiry
// capture bar would sit on top of it and compete with the order.
const NO_CAPTURE_BAR = ['/products/', '/request-quote', '/cart', '/quote/']

export default function PublicOnlyWidgets() {
  const pathname = usePathname()
  const isPrivate = PRIVATE_PATHS.some(p => pathname.startsWith(p))
  if (isPrivate) return null
  return (
    <>
      <FloatingContactWidget />
      <ChatWidget />
      {!NO_CAPTURE_BAR.some((p) => pathname.startsWith(p)) && <StickyCaptureBar />}
    </>
  )
}
