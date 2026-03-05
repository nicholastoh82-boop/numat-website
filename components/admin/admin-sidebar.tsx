'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, FileText, Inbox, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/quotes', label: 'Quotes', icon: FileText },
    { href: '/admin/inquiries', label: 'Inquiries', icon: Inbox },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminSidebar() {
    const pathname = usePathname()

    return (
        <nav className="p-4 space-y-1">
            {navItems.map((item) => {
                const Icon = item.icon
                // Check if active. For Overview, exact match. For others, startsWith.
                const isActive = item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href)

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        <Icon className="w-5 h-5" />
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}