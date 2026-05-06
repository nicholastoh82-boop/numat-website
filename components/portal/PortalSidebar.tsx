/* components/portal/PortalSidebar.tsx
   Self contained sidebar that fetches the current user and roles on mount.
   Renders nothing for users who do not have a portal role assigned.
   Drop into any layout to give it the portal navigation. */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PortalRole = 'admin' | 'ceo' | 'sales' | 'finance' | 'ops'

type NavItem = {
  href: string
  label: string
  roles: PortalRole[] | 'all'
}

// Sidebar items point to actual destination routes, not the redirect stubs.
// CRM goes straight to /crm/dashboard, Financials goes to /finance, etc.
const ALL_ITEMS: NavItem[] = [
  { href: '/portal',                label: 'Home',       roles: 'all' },
  { href: '/portal/ceo',            label: 'CEO View',   roles: ['admin', 'ceo'] },
  { href: '/crm/dashboard',         label: 'CRM',        roles: ['admin', 'sales'] },
  { href: '/finance',               label: 'Financials', roles: ['admin', 'ceo', 'finance'] },
  { href: '/finance/new',           label: 'Receipts',   roles: ['admin', 'finance', 'ops'] },
  { href: '/portal/verify',         label: 'Verify',     roles: ['admin', 'finance'] },
  { href: '/portal/production',     label: 'Production', roles: ['admin', 'ceo', 'ops'] },
  { href: '/finance/reports',       label: 'Reports',    roles: ['admin', 'ceo', 'finance'] },
  { href: '/portal/settings',       label: 'Settings',   roles: ['admin'] },
]

export default function PortalSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [roles, setRoles] = useState<PortalRole[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setLoaded(true)
        return
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
      if (cancelled) return
      setUserEmail(user.email || '')
      setRoles(((data ?? []) as Array<{ role: string }>).map(r => r.role as PortalRole))
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [])

  // Pre auth: render nothing to avoid layout shift
  if (!loaded) {
    return <aside className="w-60 shrink-0 border-r border-gray-200 bg-white" aria-hidden />
  }

  // No portal role: hide sidebar entirely
  if (roles.length === 0) {
    return null
  }

  const items = ALL_ITEMS.filter(
    (i) => i.roles === 'all' || i.roles.some((r) => roles.includes(r)),
  )

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-screen sticky top-0 h-screen">
      <div className="px-5 py-5 border-b border-gray-200">
        <Link href="/portal" className="text-base font-semibold tracking-tight text-gray-900">
          NUMAT Portal
        </Link>
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
          {roles.join(', ')}
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
