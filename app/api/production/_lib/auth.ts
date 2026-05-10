import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function requireProductionUser(): Promise<{ ok: true; email: string; userId: string } | { ok: false; status: number; error: string }> {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user?.email) return { ok: false, status: 401, error: 'Unauthorized' }
    const sc = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data: roles } = await sc.from('user_roles').select('role').eq('user_id', user.id)
    const hasRole = (roles || []).some((r: any) => ['admin', 'ceo', 'ops'].includes(r.role))
    if (!hasRole) return { ok: false, status: 403, error: 'Production access requires admin, ceo, or ops role' }
    return { ok: true, email: user.email, userId: user.id }
  } catch (e: any) {
    return { ok: false, status: 401, error: e?.message || 'Auth error' }
  }
}

export function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}
