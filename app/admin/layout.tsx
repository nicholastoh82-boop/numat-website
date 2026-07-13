'use client'

import React, { useEffect, useState, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminHeader from '@/components/admin/admin-header'
import AdminMobileNav from '@/components/admin/admin-mobile-nav'

// Role context — available to any page inside /admin
export const AdminRoleContext = createContext<{ role: string | null; name: string | null }>({
  role: null,
  name: null,
})
export const useAdminRole = () => useContext(AdminRoleContext)

// Marketing role: content and SEO only (products, news/blog, testimonials).
// Everything else in /admin (settings, quotes, inquiries, leads, pipeline, nara)
// stays off limits.
const MARKETING_ALLOWED_PREFIXES = ['/admin/products', '/admin/news', '/admin/testimonials']
function marketingCanAccess(path: string): boolean {
  if (path === '/admin') return true
  return MARKETING_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authState, setAuthState] = useState<{
    ready: boolean
    role: string | null
    name: string | null
  }>({ ready: false, role: null, name: null })

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check admin_profiles for role
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!adminProfile) {
        router.push('/')
        return
      }

      // Fetch name from crm_users
      const { data: crmUser } = await supabase
        .from('crm_users')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()

      setAuthState({
        ready: true,
        role: adminProfile.role,
        name: crmUser?.name ?? user.email ?? null,
      })
    }

    checkAuth()
  }, [router])

  // Marketing role is limited to content and SEO pages; bounce it off anything else.
  useEffect(() => {
    if (authState.ready && authState.role === 'marketing' && !marketingCanAccess(pathname)) {
      router.replace('/admin')
    }
  }, [authState, pathname, router])

  if (!authState.ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AdminRoleContext.Provider value={{ role: authState.role, name: authState.name }}>
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
    </AdminRoleContext.Provider>
  )
}