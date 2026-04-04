'use client'

import React from 'react'
import Link from 'next/link'
import { PackageCheck } from 'lucide-react'

declare const gtag: (...args: unknown[]) => void

const whatsappUrl = `https://wa.me/60162958983?text=${encodeURIComponent(
  'Hello NUMAT, I would like to request product information and a quotation.'
)}`

const btnStyle: React.CSSProperties = {
  position: 'fixed',
  right: '24px',
  width: '52px',
  height: '52px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  transition: 'transform 0.2s ease',
  zIndex: 9998,
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
}

export default function FloatingContactWidget() {
  return (
    <>
      {/* Request Samples — sits above WhatsApp */}
      <Link
        href="/request-samples"
        aria-label="Request Samples"
        style={{ ...btnStyle, bottom: '152px', background: '#1D5C3A' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <PackageCheck style={{ width: '22px', height: '22px', color: '#fff', flexShrink: 0 }} />
      </Link>

      {/* WhatsApp — sits above chat button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        style={{ ...btnStyle, bottom: '88px', background: '#25D366' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onClick={() =>
          gtag('event', 'whatsapp_click', {
            event_category: 'engagement',
            event_label: 'Floating Widget',
          })
        }
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.85.504 3.58 1.383 5.065L2 22l5.085-1.363A9.94 9.94 0 0 0 12.001 22C17.523 22 22 17.522 22 12S17.523 2 12.001 2zm0 18.154a8.12 8.12 0 0 1-4.154-1.138l-.298-.177-3.018.809.816-2.944-.194-.308A8.107 8.107 0 0 1 3.846 12c0-4.494 3.66-8.154 8.155-8.154 4.494 0 8.154 3.66 8.154 8.154 0 4.495-3.66 8.154-8.154 8.154zm4.48-6.113c-.246-.123-1.452-.716-1.677-.798-.225-.082-.389-.123-.553.123-.163.246-.634.798-.777.961-.143.164-.287.184-.533.061-.246-.122-1.038-.382-1.977-1.22-.73-.651-1.223-1.455-1.367-1.7-.143-.246-.015-.38.108-.502.11-.11.245-.287.368-.43.123-.143.163-.246.245-.41.082-.163.041-.307-.02-.43-.062-.122-.554-1.335-.758-1.827-.2-.48-.403-.414-.554-.422l-.47-.008c-.164 0-.43.061-.655.307-.225.246-.86.84-.86 2.05 0 1.21.88 2.38 1.003 2.543.123.163 1.732 2.644 4.197 3.707.587.253 1.044.404 1.4.517.589.187 1.124.16 1.548.097.472-.071 1.452-.594 1.657-1.167.205-.573.205-1.065.143-1.167-.06-.1-.224-.163-.47-.286z"/>
        </svg>
      </a>
    </>
  )
}
