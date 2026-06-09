/* app/portal/page.tsx
   Portal home. A short, grouped launcher that shows only the tools the person
   can open. It uses the same access rules and the same nav config as the
   sidebar, so the two stay in sync. */

import Link from 'next/link'
import { requirePortalUser } from '@/lib/portal/roles'
import {
  PORTAL_GROUPS,
  PORTAL_NAV,
  canSee,
  type PortalGroupKey,
} from '@/lib/portal/nav'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Factory,
  MessageSquare,
  Settings,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

const GROUP_ICON: Record<PortalGroupKey, LucideIcon> = {
  overview: LayoutDashboard,
  sales: Users,
  finance: Wallet,
  production: Factory,
  team: MessageSquare,
  admin: Settings,
}

export default async function PortalHome() {
  const user = await requirePortalUser()
  const access = { isAdmin: user.isAdmin, features: user.features }

  const groups = PORTAL_GROUPS.map((g) => ({
    ...g,
    items: PORTAL_NAV.filter((i) => i.group === g.key && canSee(i, access)),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {firstName(user.email ?? '')}
        </h1>
        <p className="text-sm text-gray-600">Pick a tool to get started.</p>
      </div>

      {groups.map((group) => {
        const Icon = GROUP_ICON[group.key]
        return (
          <section key={group.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-400" aria-hidden />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {group.title}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <span>{item.homeLabel ?? item.label}</span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function firstName(email: string): string {
  const local = email.split('@')[0] ?? ''
  if (!local) return 'there'
  return local.charAt(0).toUpperCase() + local.slice(1)
}
