/* app/portal/settings/page.tsx
   Admin only. Lists current user role assignments.
   Full role management UI ships in a later phase. */

import { requireRole } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'

type RoleRow = { user_id: string; role: string }

export default async function PortalSettings() {
  await requireRole('admin')

  const supabase = await createClient()
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('user_id, role')

  const rows = (roleRows ?? []) as RoleRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          User roles and access control.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-900">
            Active role assignments ({rows.length})
          </h2>
        </div>
        <div className="px-5 py-4">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">No roles assigned yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between border border-gray-100 bg-gray-50 rounded px-3 py-2"
                >
                  <span className="font-mono text-xs text-gray-600">
                    {r.user_id.slice(0, 8)}...
                  </span>
                  <span className="text-gray-900">{r.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-900">
        Full role management UI is not built yet. To assign or remove roles,
        run SQL directly in Supabase against the user_roles table.
      </div>
    </div>
  )
}
