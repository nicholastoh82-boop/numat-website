/* app/(shell)/finance/layout.tsx
   Server component. Auth and access are now decided on the server before any
   finance page renders, so there is no client side loading flash and no gate
   that only runs after mount. The shell above provides the sidebar and outer
   frame; this layout provides the finance header, the sub navigation the person
   is allowed to see, and the area level access gate. Finer per page rules (for
   example receipts only people may open New Transaction but not the dashboard)
   are enforced by each page's own server gate. */

import { redirect } from 'next/navigation'
import { requirePortalUser } from '@/lib/portal/roles'
import FinanceHeader from './FinanceHeader'

export const metadata = {
  title: 'NUMAT Finance',
  robots: 'noindex, nofollow',
}

type NavItem = { href: string; label: string }

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalUser()
  const has = (f: string) => user.isAdmin || user.features.includes(f)
  const financials = has('financials')
  const receipts = has('receipts')
  const reports = has('reports')

  // Area gate: need at least one finance capability to see anything here.
  if (!(financials || receipts || reports)) redirect('/portal/no-access')

  const canSeeAll = financials
  const navItems: NavItem[] = canSeeAll
    ? [
        { href: '/finance', label: 'Dashboard' },
        { href: '/finance/new', label: 'New Transaction' },
        { href: '/finance/fund', label: 'Revolving Fund' },
        { href: '/finance/transactions', label: 'All Transactions' },
        { href: '/finance/reports', label: 'Reports' },
      ]
    : [
        ...(receipts ? [{ href: '/finance/new', label: 'New Transaction' }] : []),
        ...(reports ? [{ href: '/finance/reports', label: 'Reports' }] : []),
      ]

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-white text-gray-900 pt-14 md:pt-0">
      <FinanceHeader userEmail={user.email} navItems={navItems} />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
    </div>
  )
}
