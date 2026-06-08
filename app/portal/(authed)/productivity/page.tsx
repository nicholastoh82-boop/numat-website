/* app/portal/(authed)/productivity/page.tsx
   Email productivity counter page. Visible to admin, ceo, and sales reps.
   The counter itself is scoped server side by the API: admin and ceo see all
   reps, sales reps see only their own. */

import { requireFeature } from '@/lib/portal/roles'
import EmailCounter from '@/components/portal/EmailCounter'

export const metadata = {
  title: 'Email Counter | NUMAT Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProductivityPage() {
  await requireFeature('productivity')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Email Counter</h1>
        <p className="text-sm text-gray-500 mt-1">
          Emails sent and replies received per rep, from every account. Toggle between a daily and a monthly view.
        </p>
      </div>
      <EmailCounter />
    </div>
  )
}
