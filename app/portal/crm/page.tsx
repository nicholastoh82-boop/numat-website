/* app/portal/crm/page.tsx
   Phase 2 placeholder. Redirects to the existing CRM at /crm/dashboard.
   In Phase 3 we move the CRM into the portal proper and kill /crm. */

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/portal/roles'

export default async function PortalCrmRedirect() {
  await requireRole(['admin', 'ceo', 'sales'])
  redirect('/crm/dashboard')
}
