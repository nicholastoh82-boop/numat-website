/* app/crm/login/page.tsx
   The separate CRM sign in is retired. Everyone signs in through the portal now.
   This stays only so any old link or bookmark still lands somewhere sensible. */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CrmLoginRedirect() {
  redirect('/portal/login?redirectTo=/crm/dashboard')
}
