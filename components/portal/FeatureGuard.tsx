/* components/portal/FeatureGuard.tsx
   Client guard for areas that live outside the portal authed layout, such as
   Finance and CRM. Lets a path through if it is in allowPaths (for example the
   CRM login page). Otherwise it requires a signed in numat.ph user who is an
   admin or has the given feature, and sends everyone else to the no access page. */

'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ALWAYS_ADMIN = ['nick@numat.ph']

export default function FeatureGuard({
  feature,
  loginRedirect = '/portal/login',
  allowPaths = [],
  children,
}: {
  feature: string
  loginRedirect?: string
  allowPaths?: string[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (allowPaths.some((p) => pathname === p || pathname?.startsWith(p))) {
      setReady(true)
      return
    }
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace(loginRedirect)
        return
      }
      const email = (user.email || '').toLowerCase()
      if (!email.endsWith('@numat.ph')) {
        router.replace('/portal/no-access')
        return
      }
      const [{ data: adminRows }, { data: featRows }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin'),
        supabase.from('portal_access').select('feature').eq('user_id', user.id).eq('feature', feature),
      ])
      if (cancelled) return
      const isAdmin = (adminRows && adminRows.length > 0) || ALWAYS_ADMIN.includes(email)
      const hasFeature = featRows && featRows.length > 0
      if (isAdmin || hasFeature) {
        setReady(true)
      } else {
        router.replace('/portal/no-access')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, feature, loginRedirect, router, allowPaths])

  if (!ready) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center text-sm text-gray-500">
        Loading.
      </div>
    )
  }
  return <>{children}</>
}
