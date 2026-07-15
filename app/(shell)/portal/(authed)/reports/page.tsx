/* app/portal/reports/page.tsx
   Phase 2 placeholder. Redirects to the existing /finance/reports. */

import { redirect } from 'next/navigation'
import { requireFeature } from '@/lib/portal/roles'

export default async function PortalReportsRedirect() {
  await requireFeature('reports')
  redirect('/finance/reports')
}
