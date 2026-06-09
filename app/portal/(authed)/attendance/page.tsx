/* app/portal/(authed)/attendance/page.tsx
   Clock in and clock out. Gated by the 'attendance' feature (admins always
   pass). Staff clock in or out and see their recent events. Admins see recent
   events across the team with the location each was made from. */

import { requireFeature } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { ClockButton } from '@/components/portal/attendance-tools'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Clock In | NUMAT Portal',
  robots: 'noindex, nofollow',
}

type Row = {
  id: string
  user_email: string | null
  event_type: string
  latitude: number | null
  longitude: number | null
  created_at: string
}

const COLS = 'id, user_email, event_type, latitude, longitude, created_at'

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function AttendancePage() {
  const user = await requireFeature('attendance')
  const supabase = await createClient()

  const { data: mineData } = await supabase
    .from('clock_events')
    .select(COLS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)
  const mine = (mineData ?? []) as Row[]

  const clockedIn = mine.length > 0 && mine[0].event_type === 'in'

  let team: Row[] = []
  if (user.isAdmin) {
    const { data: teamData } = await adminClient()
      .from('clock_events')
      .select(COLS)
      .order('created_at', { ascending: false })
      .limit(40)
    team = (teamData ?? []) as Row[]
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Clock In</h1>
        <p className="text-sm text-gray-600">
          {clockedIn ? 'You are clocked in.' : 'You are clocked out.'}
        </p>
      </div>

      <ClockButton clockedIn={clockedIn} />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          My recent activity
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-500">No clock events yet.</p>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                <span className="font-medium text-gray-900">
                  {r.event_type === 'in' ? 'Clocked in' : 'Clocked out'}
                </span>
                <span className="text-gray-500">{formatDate(r.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {user.isAdmin && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Team activity
          </h2>
          {team.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing yet.</p>
          ) : (
            <div className="space-y-2">
              {team.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      {r.user_email || 'Member'}
                      <span className="ml-2 font-normal text-gray-500">
                        {r.event_type === 'in' ? 'in' : 'out'}
                      </span>
                    </div>
                    <div className="text-gray-500">{formatDate(r.created_at)}</div>
                  </div>
                  {r.latitude != null && r.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      View location
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-gray-400">Location not shared</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
