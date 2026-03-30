import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bamboo Applications — Fit-Outs, Furniture, Flooring & More',
  description: 'Engineered bamboo for commercial fit-outs, furniture manufacturing, flooring, and wall systems. See how NUMAT boards perform across interior and commercial applications.',
  openGraph: {
    title: 'Bamboo Applications — NUMAT',
    description: 'Commercial fit-outs, furniture manufacturing, flooring, wall systems and more. See NUMAT bamboo in action.',
    url: 'https://numatbamboo.com/applications',
  },
}

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}