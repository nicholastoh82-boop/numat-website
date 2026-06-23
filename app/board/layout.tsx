import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'NUMAT Board View',
  robots: { index: false, follow: false },
}

export default function BoardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
