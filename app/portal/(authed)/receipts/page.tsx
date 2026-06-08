/* app/portal/receipts/page.tsx
   Phase 2 placeholder. Redirects to the existing transaction submission page.
   This is where Boyet will eventually submit receipts as pending. */

import { redirect } from 'next/navigation'
import { requireFeature } from '@/lib/portal/roles'

export default async function PortalReceiptsRedirect() {
  await requireFeature('receipts')
  redirect('/finance/new')
}
