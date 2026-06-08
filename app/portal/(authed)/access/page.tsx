/*
  app/portal/(authed)/access/page.tsx
  Admin only. Lets the admin pick which functions each person can see.
*/

import { requireAdmin } from '@/lib/portal/roles'
import AccessClient from './_components/AccessClient'

export const metadata = {
  title: 'Access',
  robots: 'noindex, nofollow',
}

export default async function AccessPage() {
  await requireAdmin()
  return <AccessClient />
}
