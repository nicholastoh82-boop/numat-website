/* app/portal/page.tsx
   Home tab. Any authenticated user lands here.
   Cards are filtered by role so each user sees only what they can act on. */

import Link from 'next/link'
import { requirePortalUser } from '@/lib/portal/roles'

export default async function PortalHome() {
  const user = await requirePortalUser()
  const noRole = user.roles.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {firstName(user.email ?? '')}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {noRole
            ? 'Your account has no role assigned yet. Ask Nick to grant you access.'
            : `Signed in as ${user.roles.join(', ')}`}
        </p>
      </div>

      {!noRole && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(user.isAdmin || user.isCeo || user.isSales) && (
            <QuickCard
              href="/portal/crm"
              title="CRM"
              blurb="Leads, quotes, invoices, payment receipts."
            />
          )}
          {(user.isAdmin || user.isCeo || user.isFinance) && (
            <QuickCard
              href="/portal/financials"
              title="Financials"
              blurb="Bank balances, transactions, P and L, runway."
            />
          )}
          {(user.isAdmin || user.isFinance || user.isOps) && (
            <QuickCard
              href="/portal/receipts"
              title="Receipts"
              blurb="Submit receipts, reconcile revolving fund."
            />
          )}
          {(user.isAdmin || user.isCeo || user.isOps) && (
            <QuickCard
              href="/portal/production"
              title="Production"
              blurb="Factory utilization, capacity, yields."
            />
          )}
          {(user.isAdmin || user.isCeo || user.isFinance) && (
            <QuickCard
              href="/portal/reports"
              title="Reports"
              blurb="Monthly summaries, board exports."
            />
          )}
          {user.isAdmin && (
            <QuickCard
              href="/portal/settings"
              title="Settings"
              blurb="Users, roles, system config."
            />
          )}
        </div>
      )}
    </div>
  )
}

function QuickCard({
  href,
  title,
  blurb,
}: {
  href: string
  title: string
  blurb: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-gray-200 p-5 bg-white hover:border-gray-400 transition"
    >
      <div className="text-sm font-medium text-gray-900">{title}</div>
      <div className="mt-1 text-xs text-gray-600">{blurb}</div>
    </Link>
  )
}

function firstName(email: string): string {
  const local = email.split('@')[0] ?? ''
  if (!local) return 'there'
  return local.charAt(0).toUpperCase() + local.slice(1)
}
