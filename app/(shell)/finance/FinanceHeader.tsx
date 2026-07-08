/* app/(shell)/finance/FinanceHeader.tsx
   Client part of the finance layout: the title bar, the current user and sign
   out, and the sub navigation with its active state. Access is already decided
   on the server, so this only renders what it is handed. */

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type NavItem = { href: string; label: string }

export default function FinanceHeader({
  userEmail,
  navItems,
}: {
  userEmail: string | null
  navItems: NavItem[]
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 space-y-2 md:space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/finance" className="text-lg md:text-xl font-semibold tracking-tight truncate">
            NUMAT Finance
          </Link>
          <div className="hidden md:flex items-center gap-3 text-sm text-gray-600 shrink-0">
            <span className="truncate max-w-[200px]" title={userEmail || ''}>{userEmail}</span>
            <button onClick={handleSignOut} className="text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>

        {/* Sub-nav: horizontally scrollable on mobile */}
        <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/finance' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded text-sm whitespace-nowrap shrink-0 ${
                  active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
