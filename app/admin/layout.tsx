'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminHeader from '@/components/admin/admin-header'
import AdminMobileNav from '@/components/admin/admin-mobile-nav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/auth/login')
                return
            }

            const { data: adminProfile } = await supabase
                .from('admin_profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()

            if (!adminProfile) {
                router.push('/')
                return
            }

            setIsAuthenticated(true)
        }

        checkAuth()
    }, [router])

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AdminHeader />
            <div className="flex flex-1">
                <aside className="hidden lg:block w-64 border-r border-border bg-card">
                    <AdminSidebar />
                </aside>
                <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-h-[calc(100vh-57px)]">
                    {children}
                </main>
            </div>
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
                <AdminMobileNav />
            </div>
        </div>
    )
}