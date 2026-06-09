/* app/portal/(authed)/payslips/page.tsx
   Payslips. Every signed in staff member can open this and see only their own.
   Admins also get an upload form and the full list. Files are served through
   short lived signed links, never public. */

import { requirePortalUser } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { OpenButton, DeleteButton, AdminUpload } from '@/components/portal/payslips-tools'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Payslips | NUMAT Portal',
  robots: 'noindex, nofollow',
}

type Mine = { id: string; period: string; file_name: string | null; created_at: string }
type All = Mine & { user_email: string | null }

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function PayslipsPage() {
  const user = await requirePortalUser()
  const supabase = await createClient()

  const { data: mineData } = await supabase
    .from('payslips')
    .select('id, period, file_name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const mine = (mineData ?? []) as Mine[]

  let all: All[] = []
  if (user.isAdmin) {
    const { data } = await adminClient()
      .from('payslips')
      .select('id, user_email, period, file_name, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    all = (data ?? []) as All[]
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Payslips</h1>
        <p className="text-sm text-gray-600">Your payslips are private to you.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          My payslips
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-500">No payslips yet.</p>
        ) : (
          <div className="space-y-2">
            {mine.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{p.period}</div>
                  <div className="truncate text-gray-500">
                    {p.file_name || 'Payslip'} | {formatDate(p.created_at)}
                  </div>
                </div>
                <OpenButton id={p.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {user.isAdmin && (
        <>
          <AdminUpload />

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              All payslips
            </h2>
            {all.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {all.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">
                        {p.user_email || 'Staff'}
                        <span className="ml-2 font-normal text-gray-500">{p.period}</span>
                      </div>
                      <div className="truncate text-gray-500">
                        {p.file_name || 'Payslip'} | {formatDate(p.created_at)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <OpenButton id={p.id} />
                      <DeleteButton id={p.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
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
    })
  } catch {
    return iso
  }
}
