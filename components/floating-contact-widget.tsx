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
    <div className="fixed bottom-20 right-5 z-[80] flex flex-col gap-3 sm:bottom-5">
      <Link
        href="/request-samples"
        aria-label="Request Samples"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 sm:h-auto sm:w-auto sm:gap-3 sm:px-4 sm:py-3"
      >
        <PackageCheck className="h-5 w-5" />
        <span className="hidden text-sm font-semibold sm:inline">Request Samples</span>
      </Link>

      
    
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 sm:h-auto sm:w-auto sm:gap-3 sm:px-4 sm:py-3"
      >
        <MessageCircleMore className="h-5 w-5" />
        <span className="hidden text-sm font-semibold sm:inline">WhatsApp Sales</span>
      </a>

      <a
        href={viberUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on Viber"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 sm:h-auto sm:w-auto sm:gap-3 sm:px-4 sm:py-3"
      >
        <PhoneCall className="h-5 w-5" />
        <span className="hidden text-sm font-semibold sm:inline">Viber Sales</span>
      </a>
    </div>
  )
}