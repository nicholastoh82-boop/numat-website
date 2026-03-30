'use client'

import Link from 'next/link'
import { MessageCircleMore, PackageCheck } from 'lucide-react'

declare const gtag: (...args: unknown[]) => void

const whatsappUrl = `https://wa.me/60162958983?text=${encodeURIComponent(
  'Hello NUMAT, I would like to request product information and a quotation.'
)}`

export default function FloatingContactWidget() {
  return (
    <div className="fixed bottom-20 right-5 z-[80] flex flex-col gap-3 sm:bottom-5">
      <Link
        href="/request-samples"
        aria-label="Request Samples"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 text-white sm:h-auto sm:w-auto sm:gap-3 sm:px-4 sm:py-3"
      >
        <PackageCheck className="h-5 w-5 text-white" />
        <span className="hidden text-sm font-semibold text-white sm:inline">Request Samples</span>
      </Link>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 sm:h-auto sm:w-auto sm:gap-3 sm:px-4 sm:py-3"
        onClick={() => gtag('event', 'whatsapp_click', { event_category: 'engagement', event_label: 'Floating Widget' })}
      >
        <MessageCircleMore className="h-5 w-5 text-white" />
        <span className="hidden text-sm font-semibold text-white sm:inline">WhatsApp Sales</span>
      </a>
    </div>
  )
}