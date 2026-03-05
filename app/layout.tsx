import React from "react"
import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: '--font-sans'
});

const dmSerif = DM_Serif_Display({ 
  subsets: ["latin"],
  weight: "400",
  variable: '--font-serif'
});

export const metadata: Metadata = {
  title: 'NUMAT | Premium NuBam Engineered Bamboo Products Worldwide',
  description: 'Premium NuBam engineered bamboo boards for furniture, flooring, doors, and structural applications. Get instant quotes via WhatsApp or Viber. FSC-certified, sustainable, and carbon-negative bamboo products.',
  keywords: ['bamboo boards', 'engineered bamboo', 'sustainable materials', 'bamboo furniture', 'bamboo flooring', 'eco-friendly construction', 'NuBam boards'],
  authors: [{ name: 'NUMAT' }],
  openGraph: {
    title: 'NUMAT | Premium NuBam Engineered Bamboo Products',
    description: 'Premium NuBam engineered bamboo boards for furniture, flooring, doors, and structural applications worldwide.',
    type: 'website',
    locale: 'en_US',
  },
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: '#4a7c59',
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
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
