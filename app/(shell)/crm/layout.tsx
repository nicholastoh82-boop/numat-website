/* app/(shell)/crm/layout.tsx
   Server component. The shell above provides the sidebar and the outer frame.
   The whole CRM needs the same crm feature, so the gate lives here on the
   server (was a client FeatureGuard before, which flashed a loading state and
   checked access only after the page mounted). */

import type { Metadata } from 'next'
import { requireFeature } from '@/lib/portal/roles'

export const metadata: Metadata = {
  title: 'NUMAT Sales CRM',
  robots: 'noindex, nofollow',
}

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  await requireFeature('crm')

  return <div className="flex-1 min-w-0 pt-14 md:pt-0">{children}</div>
}
