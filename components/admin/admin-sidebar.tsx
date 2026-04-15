'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  FileText,
  Inbox,
  Settings,
  MessageSquareQuote,
  Newspaper,
  Bot,
  Users,
  BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminRole } from '@/app/admin/layout'

export default function AdminSidebar() {
  const pathname = usePathname()
  const { role } = useAdminRole()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const linkClass = (href: string) =>
    cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
      isActive(href)
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    )

  // Rep-only nav (limited)
  if (role === 'rep') {
    return (
      <nav className="p-4 space-y-1">
        <Link href="/admin/leads" className={linkClass('/admin/leads')}>
          <Users className="w-5 h-5" />
          My Leads
        </Link>
        <Link href="/admin/pipeline" className={linkClass('/admin/pipeline')}>
          <BarChart2 className="w-5 h-5" />
          Pipeline
        </Link>
      </nav>
    )
  }

  // Admin nav (full)
  return (
    <nav className="p-4 space-y-1">
      <Link href="/admin" className={linkClass('/admin')}>
        <LayoutDashboard className="w-5 h-5" />
        Overview
      </Link>

      <Link href="/admin/leads" className={linkClass('/admin/leads')}>
        <Users className="w-5 h-5" />
        Leads
      </Link>

      <Link href="/admin/pipeline" className={linkClass('/admin/pipeline')}>
        <BarChart2 className="w-5 h-5" />
        Pipeline
      </Link>

      <Link href="/admin/products" className={linkClass('/admin/products')}>
        <Package className="w-5 h-5" />
        Products
      </Link>

      <Link href="/admin/news" className={linkClass('/admin/news')}>
        <Newspaper className="w-5 h-5" />
        News
      </Link>

      <Link href="/admin/testimonials" className={linkClass('/admin/testimonials')}>
        <MessageSquareQuote className="w-5 h-5" />
        Testimonials
      </Link>

      <Link href="/admin/quotes" className={linkClass('/admin/quotes')}>
        <FileText className="w-5 h-5" />
        Quotes
      </Link>

      <Link href="/admin/inquiries" className={linkClass('/admin/inquiries')}>
        <Inbox className="w-5 h-5" />
        Inquiries
      </Link>

      <Link href="/admin/nara" className={linkClass('/admin/nara')}>
        <Bot className="w-5 h-5" />
        NARA
      </Link>

      <Link href="/admin/settings" className={linkClass('/admin/settings')}>
        <Settings className="w-5 h-5" />
        Settings
      </Link>
    </nav>
  )
}