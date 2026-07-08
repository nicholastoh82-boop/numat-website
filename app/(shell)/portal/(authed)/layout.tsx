/* app/(shell)/portal/(authed)/layout.tsx
   Server component. The shell above provides the sidebar, the outer frame and
   the signed in check, so this layout only sets the portal page container.
   requirePortalUser is kept here as a defensive, cached second check. */

import { requirePortalUser } from '@/lib/portal/roles'

export const metadata = {
  title: 'NUMAT Portal',
  robots: 'noindex, nofollow',
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePortalUser()

  return <div className="max-w-7xl mx-auto px-6 py-8 pt-16 md:pt-8">{children}</div>
}
