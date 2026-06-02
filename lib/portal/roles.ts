/* lib/portal/roles.ts
   Server side helpers used by all portal pages and route handlers.
   Reads roles from the user_roles table created in Phase 1. */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export type PortalRole = 'admin' | 'ceo' | 'sales' | 'finance' | 'ops' | 'viewer'

export type PortalUser = {
  id: string
  email: string | null
  roles: PortalRole[]
  isAdmin: boolean
  isCeo: boolean
  isSales: boolean
  isFinance: boolean
  isOps: boolean
  isViewer: boolean
}

export const getPortalUser = cache(async function getPortalUser(): Promise<PortalUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)

  const roles = ((roleRows ?? []) as Array<{ role: string }>).map(
    (r) => r.role as PortalRole,
  )

  return {
    id: user.id,
    email: user.email ?? null,
    roles,
    isAdmin: roles.includes('admin'),
    isCeo: roles.includes('ceo'),
    isSales: roles.includes('sales'),
    isFinance: roles.includes('finance'),
    isOps: roles.includes('ops'),
    isViewer: roles.includes('viewer'),
  }
})

/* Redirects to portal login if no auth session. */
export async function requirePortalUser(): Promise<PortalUser> {
  const user = await getPortalUser()
  if (!user) redirect('/portal/login?redirectTo=/portal')
  return user
}

/* Use inside a page to enforce a role for that specific page.
   Sends the user to access denied if they lack every required role. */
export async function requireRole(
  roles: PortalRole | PortalRole[],
): Promise<PortalUser> {
  const user = await requirePortalUser()
  const required = Array.isArray(roles) ? roles : [roles]
  const ok = required.some((r) => user.roles.includes(r))
  if (!ok) redirect('/portal/access-denied')
  return user
}
