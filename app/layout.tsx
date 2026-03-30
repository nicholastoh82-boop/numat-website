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
  metadataBase: new URL('https://numatbamboo.com'),
  title: {
    default: 'NUMAT Bamboo | Engineered Bamboo Boards for Furniture, Interiors & Projects',
    template: '%s | NUMAT Bamboo',
  },
  description:
    'Engineered bamboo boards for furniture, cabinetry, interiors, doors, wall systems, and commercial applications. Sustainably Harvested, DOST/ASTM tested, export-ready supply from the Philippines.',
  keywords: [
    'engineered bamboo boards',
    'bamboo boards Philippines',
    'Sustainably Harvested bamboo',
    'bamboo furniture boards',
    'bamboo wall panels',
    'bamboo doors',
    'bamboo flooring',
    'sustainable building materials',
    'commercial bamboo supply',
    'Dendrocalamus asper',
    'bamboo fit-out materials',
    'carbon negative building materials',
    'bamboo export Philippines',
    'NuBam board',
    'NuWall bamboo',
  ],
  authors: [{ name: 'NUMAT Sustainable Manufacturing Inc' }],
  creator: 'NUMAT',
  publisher: 'NUMAT Sustainable Manufacturing Inc',
  generator: 'Next.js',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'NUMAT Bamboo | Engineered Bamboo Boards for Commercial & Interior Applications',
    description:
      'Sustainably Harvested engineered bamboo boards with DOST/ASTM testing, technical documentation, sample support, and export-ready supply from the Philippines.',
    type: 'website',
    url: 'https://numatbamboo.com',
    siteName: 'NUMAT Bamboo',
    locale: 'en_US',
    images: [
      {
        url: '/og-social.jpg',
        width: 1200,
        height: 630,
        alt: 'NUMAT Bamboo — Engineered Bamboo Boards',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NUMAT Bamboo | Engineered Bamboo Boards',
    description:
      'Sustainably Harvested engineered bamboo boards for furniture, interiors, and commercial applications. Export-ready supply from the Philippines.',
    images: ['/og-social.jpg'],
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