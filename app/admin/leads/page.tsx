// app/admin/leads/page.tsx
// The standalone Sales Rep leads page has been retired. Everyone (admin and
// reps, including Bryan) now uses the single CRM at /crm/dashboard, so this
// route permanently redirects there to avoid two separate lead interfaces.
// The previous implementation remains in git history if it is ever needed.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdminLeadsRedirect() {
  redirect('/crm/dashboard')
}
