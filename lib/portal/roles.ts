/* lib/portal/roles.ts
   Server side access control for the portal.

   The numat.ph email is the gate. Any signed in numat.ph person is allowed
   into the portal and gets a safe baseline (home, chat, scoreboard) on first
   arrival. What else they can see is controlled per person in the portal_access
   table, managed from the admin Access page. Admins have full access. */

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export type PortalRole = 'admin' | 'ceo' | 'sales' | 'finance' | 'ops' | 'viewer'

// Owner emails that always have full access, so the owner can never lock
// themselves out of the access controls.
const ALWAYS_ADMIN = ['nick@numat.ph']

// Features every signed in numat.ph person gets the first time they arrive.
const BASELINE_FEATURES = ['home', 'chat', 'scoreboard']

export type PortalUser = {
  id: string
  email: string | null
  roles: PortalRole[]
  features: string[]
  isAdmin: boolean
}

function isNumat(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith('@numat.ph')
}

function serviceClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export const getPortalUser = cache(async function getPortalUser(): Promise<PortalUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: roleRows }, { data: featRows }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('portal_access').select('feature').eq('user_id', user.id),
  ])

  const roles = ((roleRows ?? []) as Array<{ role: string }>).map((r) => r.role as PortalRole)
  const features = ((featRows ?? []) as Array<{ feature: string }>).map((f) => f.feature)
  const email = user.email ?? null
  const isAdmin =
    roles.includes('admin') || (email ? ALWAYS_ADMIN.includes(email.toLowerCase()) : false)

  return { id: user.id, email, roles, features, isAdmin }
})

// Allows a signed in numat.ph user into the portal. Domain is the gate.
// Brand new numat.ph users get the baseline features on first arrival.
export async function requirePortalUser(): Promise<PortalUser> {
  const user = await getPortalUser()
  if (!user) redirect('/portal/login?redirectTo=/portal')
  if (!isNumat(user.email)) redirect('/portal/no-access')

  if (user.features.length === 0) {
    try {
      const admin = serviceClient()
      await admin
        .from('portal_access')
        .upsert(
          BASELINE_FEATURES.map((feature) => ({ user_id: user.id, feature })),
          { onConflict: 'user_id,feature', ignoreDuplicates: true },
        )
    } catch {
      // Non fatal. Baseline still applies in memory for this request.
    }
    user.features = [...BASELINE_FEATURES]
  }
  return user
}

export async function requireFeature(feature: string): Promise<PortalUser> {
  const user = await requirePortalUser()
  if (user.isAdmin) return user
  if (user.features.includes(feature)) return user
  redirect('/portal/no-access')
}

// Passes if the person has any one of the listed features (admins always pass).
// Used for pages reachable under more than one grant, for example the New
// Transaction page which both financials and receipts holders may open.
export async function requireAnyFeature(features: string[]): Promise<PortalUser> {
  const user = await requirePortalUser()
  if (user.isAdmin) return user
  if (features.some((f) => user.features.includes(f))) return user
  redirect('/portal/no-access')
}

export async function requireAdmin(): Promise<PortalUser> {
  const user = await requirePortalUser()
  if (!user.isAdmin) redirect('/portal/no-access')
  return user
}

// Kept for any caller still using roles. Admins always pass.
export async function requireRole(roles: PortalRole | PortalRole[]): Promise<PortalUser> {
  const user = await requirePortalUser()
  if (user.isAdmin) return user
  const required = Array.isArray(roles) ? roles : [roles]
  if (required.some((r) => user.roles.includes(r))) return user
  redirect('/portal/no-access')
}
