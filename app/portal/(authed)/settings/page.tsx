/* app/portal/settings/page.tsx
   Admin only. Lists who has what role across the team.
   Pulls emails via the list_user_roles_with_email RPC (admin gated). */

import { requireRole } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'

type DirectoryRow = {
  user_id: string
  email: string
  role: string
  created_at: string
}

export default async function PortalSettings() {
  await requireRole('admin')

  const supabase = await createClient()
  const { data } = await supabase.rpc('list_user_roles_with_email')
  const rows = (data ?? []) as DirectoryRow[]

  // Group by email so each person shows once with all their roles
  const byEmail = new Map<string, string[]>()
  for (const r of rows) {
    const list = byEmail.get(r.email) ?? []
    list.push(r.role)
    byEmail.set(r.email, list)
  }
  const grouped = Array.from(byEmail.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Who can see what. This page lists every user with portal access and the roles they hold.
          Roles control which sidebar tabs they see and which database rows they can read or write.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-900">
            Active users ({grouped.length})
          </h2>
        </div>
        {grouped.length === 0 ? (
          <div className="px-5 py-4 text-sm text-gray-500">No roles assigned yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Email</th>
                <th className="text-left px-5 py-2 font-medium">Roles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grouped.map(([email, roles]) => (
                <tr key={email}>
                  <td className="px-5 py-2 text-gray-900">{email}</td>
                  <td className="px-5 py-2 text-gray-700">{roles.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 text-xs text-gray-600 space-y-2">
        <p className="font-medium text-gray-900">Role meanings</p>
        <p><span className="font-medium">admin</span>: full access including settings.</p>
        <p><span className="font-medium">ceo</span>: full read access, no admin settings.</p>
        <p><span className="font-medium">sales</span>: CRM only. Cannot see financials.</p>
        <p><span className="font-medium">finance</span>: financial transactions, accounts, receipts.</p>
        <p><span className="font-medium">ops</span>: receipt uploads. PHP accounts only, USD and SGD blocked.</p>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-900">
        Role assignment UI is not built yet. To add or remove roles, run SQL directly
        against the user_roles table in Supabase.
      </div>
    </div>
  )
}
