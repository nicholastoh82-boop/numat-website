/* app/portal/access-denied/page.tsx
   Shown when a user has a session but lacks the role for the page they tried. */

import Link from 'next/link'
import { requirePortalUser } from '@/lib/portal/roles'

export default async function AccessDenied() {
  const user = await requirePortalUser()

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
      <p className="text-sm text-gray-600">
        Your account does not have permission for that page.
        {user.roles.length === 0
          ? ' No roles are assigned to you yet.'
          : ` Your current roles: ${user.roles.join(', ')}.`}
      </p>
      <p className="text-sm text-gray-600">
        If this is a mistake, ask Nick to update your role in Settings.
      </p>
      <Link
        href="/portal"
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        Back to home
      </Link>
    </div>
  )
}
