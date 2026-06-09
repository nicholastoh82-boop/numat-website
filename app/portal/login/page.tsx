/* app/portal/login/page.tsx
   Dedicated login for the portal. Accepts any user with a portal role assigned
   (admin, ceo, sales, finance, ops). This is the single sign in for everything. */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './_components/LoginForm'

export const metadata = {
  title: 'NUMAT Portal Login',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'

export default async function PortalLogin({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}) {
  const params = await searchParams
  const redirectTo = params.redirectTo || '/portal'

  // If already logged in with a role, skip the form and go straight in.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const email = (user.email || '').toLowerCase()
    if (email.endsWith('@numat.ph')) {
      redirect(redirectTo)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">NUMAT Portal</h1>
          <p className="text-sm text-gray-600 mt-1">Sign in with your NUMAT account</p>
        </div>
        <LoginForm redirectTo={redirectTo} initialError={params.error} />
      </div>
    </div>
  )
}
