/*
  app/portal/(authed)/mentions/page.tsx
  Shows the current person every time they were tagged in Team Chat.
  Available to anyone signed in (you do not need a special function to be tagged).
*/

import { requirePortalUser } from '@/lib/portal/roles'
import MentionsClient from './_components/MentionsClient'
import { PushToggle } from '@/components/portal/push-toggle'

export const metadata = {
  title: 'Notifications',
  robots: 'noindex, nofollow',
}

export default async function MentionsPage() {
  await requirePortalUser()
  return (
    <div className="space-y-6">
      <PushToggle />
      <MentionsClient />
    </div>
  )
}
