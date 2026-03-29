'use client'

import { MessageCircleMore, PhoneCall } from 'lucide-react'

const whatsappNumber = '601139593956'
const viberNumber = '639628127829'

const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  'Hello NUMAT, I would like to request product information and a quotation.'
)}`
const viberUrl = `viber://chat?number=%2B${viberNumber}`

export default function FloatingContactWidget() {
  return (
    <div className="fixed bottom-20 right-5 z-[80] flex flex-col gap-3 sm:bottom-5">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex items-center gap-3 rounded-full bg-[#1f6f43] px-4 py-3 text-white shadow-xl transition hover:scale-[1.02] hover:bg-[#185a36]"
      >
        <MessageCircleMore className="h-5 w-5" />
        <span className="text-sm font-semibold">WhatsApp Sales</span>
      </a>

      <a
        href={viberUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on Viber"
        className="flex items-center gap-3 rounded-full bg-[#6d43c1] px-4 py-3 text-white shadow-xl transition hover:scale-[1.02] hover:bg-[#5a35a6]"
      >
        <PhoneCall className="h-5 w-5" />
        <span className="text-sm font-semibold">Viber Sales</span>
      </a>
    </div>
  )
}