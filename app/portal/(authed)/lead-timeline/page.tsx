/* app/portal/(authed)/lead-timeline/page.tsx
   Lead status page with two tabs: a status Table (default) and a milestone
   Timeline (Gantt). Both show the active leads with deal value and the key
   milestone dates. Visible to admin, ceo, sales, and viewer (Wavemaker Impact). */

import { requireRole } from '@/lib/portal/roles'
import LeadStatusTabs from '@/components/portal/LeadStatusTabs'

export const metadata = {
  title: 'Lead Status | NUMAT Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LeadStatusPage() {
  await requireRole(['admin', 'ceo', 'sales', 'viewer'])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Lead Status</h1>
        <p className="text-sm text-gray-500 mt-1">
          The most recent leads the team is working, with the deal value and where each one stands.
          Use Table for the full detail, or Timeline to see each deal as a bar across time.
        </p>
      </div>
      <LeadStatusTabs />
    </div>
  )
}
