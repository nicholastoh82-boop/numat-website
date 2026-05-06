/* app/portal/financials/page.tsx
   Phase 2 placeholder. Redirects to the existing /finance app. */

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/portal/roles'

export default async function PortalFinancialsRedirect() {
  await requireRole(['admin', 'ceo', 'finance'])
  redirect('/finance')
}
