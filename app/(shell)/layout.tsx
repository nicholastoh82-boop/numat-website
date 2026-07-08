/* app/(shell)/layout.tsx
   The one shell for every signed in internal area: the portal, the CRM and
   finance all live under this route group, so the sidebar mounts once and stays
   put as the person moves between them. Before this, each area had its own copy
   of the sidebar, so crossing from the portal to the CRM to finance tore the
   sidebar down and rebuilt it every time (a refetch and a flash on each hop).

   The route group name in parentheses does not change any URL: pages under here
   still resolve to /portal/..., /crm/... and /finance/... exactly as before. The
   pre sign in pages (/portal/login and /portal/no-access) sit outside this group
   on purpose, so they never get the sidebar or this auth gate.

   Auth: one server side check for a signed in numat.ph person. Each area still
   applies its own finer grained feature checks below this. */

import { requirePortalUser } from '@/lib/portal/roles'
import PortalSidebar from '@/components/portal/PortalSidebar'

export const metadata = {
  title: 'NUMAT Portal',
  robots: 'noindex, nofollow',
}

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePortalUser()

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <PortalSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
