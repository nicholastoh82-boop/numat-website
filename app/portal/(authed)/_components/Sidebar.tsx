/* app/portal/(authed)/_components/Sidebar.tsx
   Client component used by the portal authed layout.
   Receives roles from the layout. Mobile: hamburger toggle. */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PortalRole } from '@/lib/portal/roles'

type NavItem = {
  href: string
  label: string
  roles: PortalRole[] | 'all'
}

const ALL_ITEMS: NavItem[] = [
  { href: '/portal',            label: 'Home',       roles: 'all' },
  { href: '/portal/ceo',        label: 'CEO View',   roles: ['admin', 'ceo'] },
  { href: '/portal/crm',        label: 'CRM',        roles: ['admin', 'sales'] },
  { href: '/portal/financials', label: 'Financials', roles: ['admin', 'ceo', 'finance'] },
  { href: '/portal/receipts',   label: 'Receipts',   roles: ['admin', 'finance', 'ops'] },
  { href: '/portal/verify',     label: 'Verify',     roles: ['admin', 'finance'] },
  { href: '/portal/production', label: 'Production', roles: ['admin', 'ceo', 'ops'] },
  { href: '/portal/reports',    label: 'Reports',    roles: ['admin', 'ceo', 'finance'] },
  { href: '/portal/settings',   label: 'Settings',   roles: ['admin'] },
]

type Props = {
  userEmail: string
  roles: PortalRole[]
}

export default function Sidebar({ userEmail, roles }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const items = ALL_ITEMS.filter(
    (i) => i.roles === 'all' || i.roles.some((r) => roles.includes(r)),
  )

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 bg-white border border-gray-200 rounded-md shadow-sm"
        aria-label="Open navigation menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`
          w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen
          fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out
          md:sticky md:top-0 md:translate-x-0 md:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="px-5 py-5 border-b border-gray-200 flex items-center justify-between">
          <Link href="/portal" className="text-base font-semibold tracking-tight text-gray-900">
            NUMAT Portal
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-gray-500 hover:text-gray-900"
            aria-label="Close navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/portal' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 text-sm rounded ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-4 text-xs">
          <div className="text-gray-900 truncate" title={userEmail}>
            {userEmail}
          </div>
          <div className="text-gray-500 mt-0.5">
            {roles.length > 0 ? roles.join(', ') : 'no role assigned'}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 w-full text-left text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
