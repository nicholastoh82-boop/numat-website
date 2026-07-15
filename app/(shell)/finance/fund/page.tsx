/* Server gate for this finance page. Access is checked on the server before the
   client page renders. The interactive page itself lives in _client.tsx. */

import { requireFeature } from '@/lib/portal/roles'
import ClientPage from './_client'

export default async function Page() {
  await requireFeature('financials')
  return <ClientPage />
}
