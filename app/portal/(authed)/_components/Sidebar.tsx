/* app/portal/_components/Sidebar.tsx
   Client component. Filters nav items by the roles passed from the layout. */

'use client'

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
  { href: '/portal/crm',        label: 'CRM',        roles: ['admin', 'ceo', 'sales'] },
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

  const items = ALL_ITEMS.filter(
    (i) => i.roles === 'all' || i.roles.some((r) => roles.includes(r)),
  )

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/crm/login')
  }

  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-gray-200">
        <Link href="/portal" className="text-base font-semibold tracking-tight text-gray-900">
          NUMAT Portal
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/portal' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
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
          onClick={handleSignOut}
          className="mt-3 w-full text-left text-gray-500 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
