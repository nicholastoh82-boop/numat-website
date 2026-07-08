/* app/portal/(authed)/announcements/page.tsx
   Company announcements. Gated by the 'announcements' feature (admins always
   pass). Everyone allowed can read; admins get a composer and delete buttons. */

import { requireFeature } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import {
  AnnouncementComposer,
  DeleteAnnouncementButton,
} from '@/components/portal/announcements-admin'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Announcements | NUMAT Portal',
  robots: 'noindex, nofollow',
}

type Row = {
  id: string
  title: string
  body: string
  pinned: boolean
  created_by_email: string | null
  created_at: string
}

export default async function AnnouncementsPage() {
  const user = await requireFeature('announcements')
  const supabase = await createClient()

  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, pinned, created_by_email, created_at')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  const items = (data ?? []) as Row[]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-600">Company news and updates for the team.</p>
      </div>

      {user.isAdmin && <AnnouncementComposer />}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <article
              key={a.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {a.pinned && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                        Pinned
                      </span>
                    )}
                    <h2 className="text-sm font-semibold text-gray-900">{a.title}</h2>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{a.body}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {formatDate(a.created_at)}
                    {a.created_by_email ? ' by ' + a.created_by_email : ''}
                  </p>
                </div>
                {user.isAdmin && <DeleteAnnouncementButton id={a.id} />}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
