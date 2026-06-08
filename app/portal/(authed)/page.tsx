/* app/portal/page.tsx
   Home tab. Plain landing screen. Use the sidebar to navigate. */

import { requirePortalUser } from '@/lib/portal/roles'

export default async function PortalHome() {
  const user = await requirePortalUser()

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-gray-900">
        Welcome back, {firstName(user.email ?? '')}
      </h1>
      <p className="text-sm text-gray-600">
        Use the sidebar to open the tools you have access to.
      </p>
    </div>
  )
}

function firstName(email: string): string {
  const local = email.split('@')[0] ?? ''
  if (!local) return 'there'
  return local.charAt(0).toUpperCase() + local.slice(1)
}
