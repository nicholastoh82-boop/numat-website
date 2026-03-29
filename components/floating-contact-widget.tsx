'use client'

import Link from 'next/link'
import { MessageCircleMore, PhoneCall, PackageCheck } from 'lucide-react'

const whatsappNumber = '+60162958983'
const viberNumber = '+60162958983'

const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  'Hello NUMAT, I would like to request product information and a quotation.'
)}`
const viberUrl = `viber://chat?number=%2B${viberNumber}`

export default function FloatingContactWidget() {
  return (
    <div className="fixed bottom-20 right-5 z-[80] flex flex-col items-end gap-3 lg:bottom-8 lg:right-6">
      <Link
        href="/request-samples"
        aria-label="Request Samples"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 text-white shadow-lg transition hover:bg-emerald-700 lg:h-auto lg:w-auto lg:gap-2.5 lg:px-5 lg:py-3"
      >
        <PackageCheck className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm font-semibold lg:inline">Request Samples</span>
      </Link>
      
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1f6f43] text-white shadow-lg transition hover:opacity-90 lg:h-auto lg:w-auto lg:gap-2.5 lg:px-5 lg:py-3"
      >
        <MessageCircleMore className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm font-semibold lg:inline">WhatsApp Sales</span>
      </a>
      
        href={viberUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on Viber"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6d43c1] text-white shadow-lg transition hover:opacity-90 lg:h-auto lg:w-auto lg:gap-2.5 lg:px-5 lg:py-3"
      >
        <PhoneCall className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm font-semibold lg:inline">Viber Sales</span>
      </a>
    </div>
  )
}
