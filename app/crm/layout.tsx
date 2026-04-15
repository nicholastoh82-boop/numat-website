import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NUMAT Sales CRM',
  robots: 'noindex, nofollow',
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
