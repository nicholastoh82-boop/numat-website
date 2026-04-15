'use client'

import { usePathname } from 'next/navigation'
import FloatingContactWidget from '@/components/floating-contact-widget'
import ChatWidget from '@/components/chat-widget'
import StickyCaptureBar from '@/components/sticky-capture-bar'

const PRIVATE_PATHS = ['/admin', '/crm']

export default function PublicOnlyWidgets() {
  const pathname = usePathname()
  const isPrivate = PRIVATE_PATHS.some(p => pathname.startsWith(p))
  if (isPrivate) return null
  return (
    <>
      <FloatingContactWidget />
      <ChatWidget />
      <StickyCaptureBar />
    </>
  )
}
