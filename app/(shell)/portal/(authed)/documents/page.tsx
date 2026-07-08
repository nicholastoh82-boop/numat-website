/* app/portal/(authed)/documents/page.tsx
   Documents and safety. A shared library grouped by category. Every staff
   member can open documents. Admins also upload and delete. Files are served
   through short lived signed links, never public. Open to all staff. */

import { requirePortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { OpenButton, DeleteButton, AdminUpload } from '@/components/portal/documents-tools'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Documents | NUMAT Portal',
  robots: 'noindex, nofollow',
}

type Doc = {
  id: string
  category: string
  title: string
  file_name: string | null
  notes: string | null
  created_at: string
}

const ORDER = ['SOP', 'Role manual', 'Safety data sheet', 'Certification', 'Other']

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function DocumentsPage() {
  const user = await requirePortalUser()
  const a = adminClient()

  const { data } = await a
    .from('documents')
    .select('id, category, title, file_name, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  const docs = (data ?? []) as Doc[]

  const groups = new Map<string, Doc[]>()
  for (const d of docs) {
    const key = ORDER.includes(d.category) ? d.category : 'Other'
    const arr = groups.get(key) || []
    arr.push(d)
    groups.set(key, arr)
  }
  const orderedGroups = ORDER.filter((c) => (groups.get(c) || []).length > 0)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Documents and safety</h1>
        <p className="text-sm text-gray-600">
          SOPs, role manuals, safety data sheets, and certifications.
        </p>
      </div>

      {user.isAdmin && <AdminUpload />}

      {docs.length === 0 ? (
        <p className="text-sm text-gray-500">No documents yet.</p>
      ) : (
        <div className="space-y-6">
          {orderedGroups.map((cat) => (
            <section key={cat} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{cat}</h2>
              <div className="space-y-2">
                {(groups.get(cat) || []).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{d.title}</div>
                      <div className="truncate text-gray-500">
                        {d.file_name || 'File'}
                        {d.notes ? ` | ${d.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <OpenButton id={d.id} />
                      {user.isAdmin && <DeleteButton id={d.id} />}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
