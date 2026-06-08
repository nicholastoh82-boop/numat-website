/* components/portal/PortalSidebar.tsx
   Self contained sidebar. Fetches the current user, their admin status, and the
   functions they are allowed to see (portal_access), then shows only those menu
   items. Admins see everything. Renders nothing for a person with no access.
   Also shows a live red dot on Mentions when the person has unread chat tags. */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ALWAYS_ADMIN = ['nick@numat.ph']

type NavItem = {
  href: string
  label: string
  // 'baseline' shows for everyone, 'admin' shows for admins only,
  // anything else is a feature key checked against the user's access.
  feature: string
}

const ALL_ITEMS: NavItem[] = [
  { href: '/portal',                  label: 'Home',          feature: 'baseline' },
  { href: '/portal/chat',             label: 'Team Chat',     feature: 'chat' },
  { href: '/portal/mentions',         label: 'Mentions',      feature: 'chat' },
  { href: '/portal/scoreboard',       label: 'NuBam Hybrid',  feature: 'scoreboard' },
  { href: '/portal/ceo',              label: 'CEO View',      feature: 'ceo' },
  { href: '/crm/dashboard',           label: 'CRM',           feature: 'crm' },
  { href: '/portal/lead-timeline',    label: 'Lead Status',   feature: 'lead_timeline' },
  { href: '/crm/search',              label: 'KB Search',     feature: 'crm' },
  { href: '/crm/outreach',            label: 'Outreach',      feature: 'crm' },
  { href: '/crm/signals',             label: 'Buying Signals',feature: 'crm' },
  { href: '/portal/productivity',     label: 'Email Counter', feature: 'productivity' },
  { href: '/finance',                 label: 'Financials',    feature: 'financials' },
  { href: '/finance/new',             label: 'Receipts',      feature: 'receipts' },
  { href: '/portal/verify',           label: 'Verify',        feature: 'verify' },
  { href: '/portal/production',       label: 'Production',    feature: 'production' },
  { href: '/crm/production/qc',       label: '↳ QC Check',    feature: 'production' },
  { href: '/crm/production/forecast', label: '↳ Forecast',    feature: 'production' },
  { href: '/finance/reports',         label: 'Reports',       feature: 'reports' },
  { href: '/portal/access',           label: 'Access',        feature: 'admin' },
  { href: '/portal/settings',         label: 'Settings',      feature: 'admin' },
]

export default function PortalSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [features, setFeatures] = useState<string[]>([])
  const [unread, setUnread] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Load the user, admin status, and allowed functions.
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
      const email = (user.email || '').toLowerCase()
      const [{ data: roleRows }, { data: featRows }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin'),
        supabase.from('portal_access').select('feature').eq('user_id', user.id),
      ])
      if (cancelled) return
      setUserId(user.id)
      setUserEmail(user.email || '')
      setIsAdmin((roleRows && roleRows.length > 0) || ALWAYS_ADMIN.includes(email))
      setFeatures(((featRows ?? []) as Array<{ feature: string }>).map((f) => f.feature))
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [])

  // Count unread mentions. Re-checked on every navigation so opening the
  // Mentions page (which marks them read) clears the dot.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { count } = await supabase
        .from('team_mentions')
        .select('id', { count: 'exact', head: true })
        .eq('mentioned_user_id', userId)
        .is('read_at', null)
      if (!cancelled) setUnread(count || 0)
    })()
    return () => { cancelled = true }
  }, [userId, pathname])

  // Live bump of the dot when a new tag arrives.
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const ch = supabase
      .channel(`mentions_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_mentions', filter: `mentioned_user_id=eq.${userId}` },
        () => setUnread((u) => u + 1),
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (!loaded) {
    return <aside className="hidden md:block w-60 shrink-0 border-r border-gray-200 bg-white" aria-hidden />
  }

  const allowed = (item: NavItem) => {
    if (item.feature === 'baseline') return true
    if (item.feature === 'admin') return isAdmin
    return isAdmin || features.includes(item.feature)
  }

  const items = ALL_ITEMS.filter(allowed)

  if (items.length === 0) {
    return null
  }

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
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" aria-hidden />
        )}
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
            const showDot = item.href === '/portal/mentions' && unread > 0

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded ${
                  active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.label}</span>
                {showDot && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-medium bg-red-500 text-white rounded-full">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-4 text-xs">
          <div className="text-gray-900 truncate" title={userEmail}>
            {userEmail}
          </div>
          <div className="text-gray-500 mt-0.5">
            {isAdmin ? 'admin' : 'team'}
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
