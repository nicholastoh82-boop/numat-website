/* components/portal/PortalSidebar.tsx
   Self contained sidebar that fetches the current user and roles on mount.
   Renders nothing for users who do not have a portal role assigned.
   Drop into any layout to give it the portal navigation.
   Mobile: collapses behind a hamburger toggle, opens as overlay. */

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

const ALL_ITEMS: NavItem[] = [
  { href: '/portal',                label: 'Home',         roles: 'all' },
  { href: '/portal/chat',           label: 'Team Chat',    roles: 'all' },
  { href: '/portal/scoreboard',     label: 'NuBam Hybrid', roles: 'all' },
  { href: '/portal/ceo',            label: 'CEO View',   roles: ['admin', 'ceo'] },
  { href: '/crm/dashboard',         label: 'CRM',        roles: ['admin', 'sales'] },
  { href: '/portal/lead-timeline',  label: 'Lead Status', roles: ['admin', 'ceo', 'sales', 'viewer'] },
  { href: '/crm/search',            label: 'KB Search',  roles: ['admin', 'sales'] },
  { href: '/crm/outreach',          label: 'Outreach',   roles: ['admin', 'sales', 'rep'] },
  { href: '/crm/signals',           label: 'Buying Signals', roles: ['admin', 'sales'] },
  { href: '/portal/productivity',   label: 'Email Counter', roles: ['admin', 'ceo', 'sales'] },
  { href: '/finance',               label: 'Financials', roles: ['admin', 'ceo', 'finance'] },
  { href: '/finance/new',           label: 'Receipts',   roles: ['admin', 'finance', 'ops'] },
  { href: '/portal/verify',         label: 'Verify',     roles: ['admin', 'finance'] },
  { href: '/portal/production',       label: 'Production', roles: ['admin', 'ceo', 'ops', 'sales'] },
  { href: '/crm/production/qc',       label: '↳ QC Check', roles: ['admin', 'ops', 'sales'] },
  { href: '/crm/production/forecast', label: '↳ Forecast',  roles: ['admin', 'ceo', 'ops'] },
  { href: '/finance/reports',       label: 'Reports',    roles: ['admin', 'ceo', 'finance'] },
  { href: '/portal/settings',       label: 'Settings',   roles: ['admin'] },
]

export default function PortalSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [roles, setRoles] = useState<PortalRole[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

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

  // Close mobile sidebar when route changes
  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (!loaded) {
    return <aside className="hidden md:block w-60 shrink-0 border-r border-gray-200 bg-white" aria-hidden />
  }

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
    <>
      {/* Mobile hamburger button (only visible on mobile) */}
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

      {/* Backdrop on mobile when sidebar is open */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
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
            {roles.join(', ')}
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
