/* app/portal/layout.tsx
   Server component. Auth check on the server, sidebar on the client. */

import { requirePortalUser } from '@/lib/portal/roles'
import Sidebar from './_components/Sidebar'

export const metadata = {
  title: 'NUMAT Portal',
  robots: 'noindex, nofollow',
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requirePortalUser()

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <Sidebar userEmail={user.email ?? ''} roles={user.roles} />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-6 py-8 pt-16 md:pt-8">{children}</div>
      </main>
    </div>
  )
}
