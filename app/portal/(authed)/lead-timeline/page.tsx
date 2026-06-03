/* app/portal/(authed)/lead-timeline/page.tsx
   Lead status table: one row per active lead showing the deal value and the key
   milestone dates (emails, samples, quotation, proposal signed, due date, order
   completed). Replaces the Gantt as the primary view. Visible to admin, ceo,
   sales, and viewer (Wavemaker Impact). */

import { requireRole } from '@/lib/portal/roles'
import LeadStatusTable from '@/components/portal/LeadStatusTable'

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
          The most recent leads the team is working, with the deal value and where each one stands:
          last email sent and received, sample requested, sent, and received, quotation sent, proposal
          signed, due date, and order completed. Sorted by most recent activity.
        </p>
      </div>
      <LeadStatusTable />
    </div>
  )
}
