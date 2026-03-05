'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, FileText, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/quotes', label: 'Quotes', icon: FileText },
    { href: '/admin/inquiries', label: 'Inquiries', icon: Inbox },
]

export default function AdminMobileNav() {
    const pathname = usePathname()

    return (
        <div className="bg-card border-t border-border">
            <div className="flex">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.href === '/admin'
                        ? pathname === '/admin'
                        : pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
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