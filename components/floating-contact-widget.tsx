'use client'

import { MessageCircleMore, PhoneCall } from 'lucide-react'

const whatsappNumber = '601139593956'
const viberNumber = '639628127829'

const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  'Hello NUMAT, I would like to inquire about your bamboo products.'
)}`
const viberUrl = `viber://chat?number=%2B${viberNumber}`

export default function FloatingContactWidget() {
  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col gap-3">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex items-center gap-3 rounded-full bg-green-600 px-4 py-3 text-white shadow-xl transition hover:scale-[1.02] hover:bg-green-700"
      >
        <MessageCircleMore className="h-5 w-5" />
        <span className="text-sm font-semibold">WhatsApp</span>
      </a>

      <a
        href={viberUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on Viber"
        className="flex items-center gap-3 rounded-full bg-purple-600 px-4 py-3 text-white shadow-xl transition hover:scale-[1.02] hover:bg-purple-700"
      >
        <PhoneCall className="h-5 w-5" />
        <span className="text-sm font-semibold">Viber</span>
      </a>
    </div>
  )
}