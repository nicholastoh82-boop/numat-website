'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  FileText,
  Inbox,
  MessageSquareQuote,
  Newspaper,
  Users,
  BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminRole } from '@/app/admin/layout'

const adminNavItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/testimonials', label: 'Reviews', icon: MessageSquareQuote },
  { href: '/admin/quotes', label: 'Quotes', icon: FileText },
  { href: '/admin/inquiries', label: 'Inquiries', icon: Inbox },
]

const repNavItems = [
  { href: '/admin/leads', label: 'My Leads', icon: Users },
  { href: '/admin/pipeline', label: 'Pipeline', icon: BarChart2 },
]

export default function AdminMobileNav() {
  const pathname = usePathname()
  const { role } = useAdminRole()

  const navItems = role === 'rep' ? repNavItems : adminNavItems

  return (
    <div className="bg-card border-t border-border">
      <div className="flex overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'min-w-[88px] flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}