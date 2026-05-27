/* app/portal/(authed)/lead-timeline/page.tsx
   Consolidated lead pipeline timeline (Gantt) across all progressed leads and
   sample requesters, in one chart. Visible to admin, ceo, and sales. */

import { requireRole } from '@/lib/portal/roles'
import LeadTimelineChart from '@/components/portal/LeadTimelineChart'

export const metadata = {
  title: 'Lead Timeline | NUMAT Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LeadTimelinePage() {
  await requireRole(['admin', 'ceo', 'sales'])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Lead Timeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          One chart across every lead that has progressed beyond new, plus every sample requester.
          Each row is a lead, each bar is the time spent in a pipeline stage, and the green rings mark
          sample requested, sent, and received dates.
        </p>
      </div>
      <LeadTimelineChart />
    </div>
  )
}
