import React from 'react'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import WhatsAppClickTracker from '@/components/WhatsAppClickTracker'
import { Toaster } from '@/components/ui/toaster'
import { CurrencyProvider } from '@/components/providers/currency-provider'
import CountrySelectorModal from '@/components/country-selector-modal'
import PublicOnlyWidgets from '@/components/public-only-widgets'
import PwaRegister from '@/components/pwa-register'
import Script from 'next/script'
import {
  globalMetadata,
  organizationSchema,
  localBusinessSchema,
} from '@/numat-seo-metadata'
import '@/app/globals.css'

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
  ...globalMetadata,
  applicationName: 'NUMAT Portal',
  appleWebApp: {
    capable: true,
    title: 'NUMAT',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon-180.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#16361f',
  width: 'device-width',
  initialScale: 1,
}

const GA_ID = 'G-ZSZ7J2LDPF'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="contentsquare-bootstrap" strategy="afterInteractive">
          {`
            window._uxa = window._uxa || [];
          `}
        </Script>
        <Script
          src="https://t.contentsquare.net/uxa/a94870d42bc1e.js"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        <CurrencyProvider>
          {children}
          <CountrySelectorModal />
          <PublicOnlyWidgets />
          <Toaster />
          <Analytics />
          <WhatsAppClickTracker />
          <PwaRegister />
        </CurrencyProvider>
      </body>
    </html>
  )
}
