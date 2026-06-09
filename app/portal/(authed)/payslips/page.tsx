/* app/portal/(authed)/payslips/page.tsx
   Payslips. Generated from salary payouts in your financials. Every staff
   member sees their own and opens each to download. Admins generate a month
   and see everyone, including factory staff who have no login. */

import Link from 'next/link'
import { requirePortalUser } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { GenerateForm, DeletePayslip } from '@/components/portal/payslips-tools'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Payslips | NUMAT Portal',
  robots: 'noindex, nofollow',
}

type Mine = { id: string; period: string; period_label: string; currency: string; net: number }
type All = Mine & { employee_name: string; user_id: string | null }

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function money(currency: string, n: number): string {
  return `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function PayslipsPage() {
  const user = await requirePortalUser()
  const supabase = await createClient()

  const { data: mineData } = await supabase
    .from('staff_payslips')
    .select('id, period, period_label, currency, net')
    .eq('user_id', user.id)
    .order('period', { ascending: false })
  const mine = (mineData ?? []) as Mine[]

  let all: All[] = []
  if (user.isAdmin) {
    const { data } = await adminClient()
      .from('staff_payslips')
      .select('id, period, period_label, currency, net, employee_name, user_id')
      .order('period', { ascending: false })
      .order('employee_name', { ascending: true })
      .limit(1000)
    all = (data ?? []) as All[]
  }

  // Group admin list by period.
  const byPeriod = new Map<string, All[]>()
  for (const p of all) {
    const arr = byPeriod.get(p.period_label) || []
    arr.push(p)
    byPeriod.set(p.period_label, arr)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Payslips</h1>
        <p className="text-sm text-gray-600">Generated from your salary payouts. Private to you.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">My payslips</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-500">No payslips yet.</p>
        ) : (
          <div className="space-y-2">
            {mine.map((p) => (
              <Link
                key={p.id}
                href={`/portal/payslips/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{p.period_label}</span>
                <span className="text-gray-500">{money(p.currency, p.net)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {user.isAdmin && (
        <>
          <GenerateForm />

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              All payslips
            </h2>
            {all.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing generated yet.</p>
            ) : (
              <div className="space-y-4">
                {Array.from(byPeriod.entries()).map(([label, rows]) => (
                  <div key={label} className="space-y-2">
                    <div className="text-xs font-medium text-gray-700">{label}</div>
                    {rows.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900">{p.employee_name}</div>
                          <div className="text-gray-500">
                            {money(p.currency, p.net)}
                            {!p.user_id ? ' | no login' : ''}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            href={`/portal/payslips/${p.id}`}
                            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
                          >
                            Open
                          </Link>
                          <DeletePayslip id={p.id} />
                        </div>
                      </div>
                    ))}
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
