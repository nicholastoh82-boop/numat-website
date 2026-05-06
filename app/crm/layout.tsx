import type { Metadata } from 'next'
import PortalSidebar from '@/components/portal/PortalSidebar'

export const metadata: Metadata = {
  title: 'NUMAT Sales CRM',
  robots: 'noindex, nofollow',
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <PortalSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
