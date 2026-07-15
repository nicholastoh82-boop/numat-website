/* app/portal/(authed)/directory/page.tsx
   Staff directory. Lists everyone signed in with their name and email from
   Google login, plus a job title and phone each person can set for themselves.
   Open to all staff. */

import { requirePortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { MyDetails } from '@/components/portal/directory-tools'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Directory | NUMAT Portal',
  robots: 'noindex, nofollow',
}

const ALWAYS_ADMIN = ['nick@numat.ph']

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type Person = {
  id: string
  name: string
  email: string
  isAdmin: boolean
  title: string | null
  phone: string | null
}

export default async function DirectoryPage() {
  const user = await requirePortalUser()
  const a = adminClient()

  const { data: list } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const numatUsers = (list?.users || []).filter((u) =>
    (u.email || '').toLowerCase().endsWith('@numat.ph'),
  )

  const { data: adminRoleRows } = await a.from('user_roles').select('user_id').eq('role', 'admin')
  const adminIds = new Set(((adminRoleRows || []) as { user_id: string }[]).map((r) => r.user_id))

  const { data: profileRows } = await a.from('staff_profiles').select('user_id, title, phone')
  const profiles = new Map<string, { title: string | null; phone: string | null }>()
  for (const r of (profileRows || []) as { user_id: string; title: string | null; phone: string | null }[]) {
    profiles.set(r.user_id, { title: r.title, phone: r.phone })
  }

  const people: Person[] = numatUsers
    .map((u) => {
      const email = (u.email || '').toLowerCase()
      const meta = (u.user_metadata || {}) as Record<string, unknown>
      const name = (meta.full_name as string) || (meta.name as string) || u.email || 'Member'
      const p = profiles.get(u.id)
      return {
        id: u.id,
        name,
        email: u.email || '',
        isAdmin: adminIds.has(u.id) || ALWAYS_ADMIN.includes(email),
        title: p?.title ?? null,
        phone: p?.phone ?? null,
      }
    })
    .sort((x, y) => x.name.localeCompare(y.name))

  const mine = profiles.get(user.id)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Directory</h1>
        <p className="text-sm text-gray-600">Everyone on the team.</p>
      </div>

      <MyDetails initialTitle={mine?.title ?? ''} initialPhone={mine?.phone ?? ''} />

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          People ({people.length})
        </h2>
        <div className="space-y-2">
          {people.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{p.name}</span>
                {p.isAdmin && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                    Admin
                  </span>
                )}
              </div>
              {p.title && <div className="text-gray-600">{p.title}</div>}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                {p.email && (
                  <a href={`mailto:${p.email}`} className="text-blue-600 hover:text-blue-800">
                    {p.email}
                  </a>
                )}
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="text-blue-600 hover:text-blue-800">
                    {p.phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
