/* app/portal/reports/page.tsx
   Phase 2 placeholder. Redirects to the existing /finance/reports. */

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/portal/roles'

export default async function PortalReportsRedirect() {
  await requireRole(['admin', 'ceo', 'finance'])
  redirect('/finance/reports')
}
