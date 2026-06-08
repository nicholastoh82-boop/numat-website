/* app/portal/no-access/page.tsx
   Shown when a signed in person does not have access to an area. This page sits
   outside the authed layout so it never loops the access check. */

'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NoAccess() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="text-sm text-gray-600">
          You do not have access to this area yet. If you think this is a mistake, ask Nick to switch it on for you.
        </p>
        <button
          onClick={signOut}
          className="text-sm rounded px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
