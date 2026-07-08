/* app/portal/(authed)/leave/page.tsx
   Staff leave. Gated by the 'leave' feature (admins always pass). Everyone
   allowed can request leave and see their own requests. Admins also get a
   pending queue and can approve or reject. */

import { requireFeature } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { LeaveRequestForm, LeaveDecision } from '@/components/portal/leave-tools'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Leave | NUMAT Portal',
  robots: 'noindex, nofollow',
}

type Row = {
  id: string
  user_email: string | null
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: string
  created_at: string
}

const COLS =
  'id, user_email, leave_type, start_date, end_date, reason, status, created_at'

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function LeavePage() {
  const user = await requireFeature('leave')
  const supabase = await createClient()

  const { data: mineData } = await supabase
    .from('leave_requests')
    .select(COLS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const mine = (mineData ?? []) as Row[]

  let pending: Row[] = []
  if (user.isAdmin) {
    const { data: pendData } = await adminClient()
      .from('leave_requests')
      .select(COLS)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    pending = (pendData ?? []) as Row[]
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Leave</h1>
        <p className="text-sm text-gray-600">Request time off and track your requests.</p>
      </div>

      <LeaveRequestForm />

      {user.isAdmin && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Pending approvals
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing waiting.</p>
          ) : (
            <div className="space-y-2">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="min-w-0 text-sm">
                    <div className="font-medium text-gray-900">
                      {r.user_email || 'Member'}
                      <span className="ml-2 font-normal text-gray-500">
                        {labelType(r.leave_type)}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      {r.start_date} to {r.end_date}
                      {r.reason ? ', ' + r.reason : ''}
                    </div>
                  </div>
                  <LeaveDecision id={r.id} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          My requests
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-500">You have not requested any leave yet.</p>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{labelType(r.leave_type)}</div>
                  <div className="text-gray-600">
                    {r.start_date} to {r.end_date}
                    {r.reason ? ', ' + r.reason : ''}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function labelType(t: string): string {
  const m: Record<string, string> = {
    annual: 'Annual leave',
    sick: 'Sick leave',
    unpaid: 'Unpaid leave',
    other: 'Other',
  }
  return m[t] || t
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-700',
  }
  const cls = map[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
