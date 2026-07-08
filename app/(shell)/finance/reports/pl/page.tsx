/* Server gate for the Profit and Loss report. The interactive report lives in
   _client.tsx. Reachable by financials or reports holders (and admins). */

import { requireAnyFeature } from '@/lib/portal/roles'
import ClientPage from './_client'

export default async function Page() {
  await requireAnyFeature(['financials', 'reports'])
  return <ClientPage />
}
