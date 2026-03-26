import React from 'react'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { CurrencyProvider } from '@/components/providers/currency-provider'
import CountrySelectorModal from '@/components/country-selector-modal'
import FloatingContactWidget from '@/components/floating-contact-widget'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'NUMAT Bamboo | Engineered Bamboo Boards for Furniture, Interiors, and Projects',
  description:
    'FSC-certified engineered bamboo boards for furniture, cabinetry, interiors, doors, wall systems, and commercial applications. Technical documentation, sample support, and export-ready supply.',
  keywords: [
    'engineered bamboo boards',
    'bamboo boards',
    'FSC-certified bamboo',
    'bamboo furniture boards',
    'bamboo wall panels',
    'bamboo doors',
    'bamboo flooring',
    'sustainable building materials',
    'commercial bamboo supply',
  ],
  authors: [{ name: 'NUMAT' }],
  generator: 'Next.js',
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'NUMAT Bamboo | Engineered Bamboo Boards for Commercial and Interior Applications',
    description:
      'FSC-certified engineered bamboo boards with technical documentation, sample support, and export-ready supply.',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/icon.png',
        width: 192,
        height: 192,
        alt: 'NUMAT logo',
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#16361f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable} font-sans antialiased`}>
        <CurrencyProvider>
          {children}
          <CountrySelectorModal />
          <FloatingContactWidget />
          <Toaster />
          <Analytics />
        </CurrencyProvider>
      </body>
    </html>
  )
}