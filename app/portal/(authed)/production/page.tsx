/* app/portal/production/page.tsx
   Placeholder. Production module not yet built. */

import { requireRole } from '@/lib/portal/roles'

export default async function PortalProduction() {
  await requireRole(['admin', 'ceo', 'ops'])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Production</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Coming soon. Factory utilization, capacity, and yield metrics will live here.
      </div>
    </div>
  )
}
