/* app/portal/verify/page.tsx
   Verification queue for ops submissions. Admin and finance only.
   Server fetches the pending list, client handles approve/reject buttons. */

import { requireFeature } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import VerifyList, { type PendingRow } from './_components/VerifyList'

export const dynamic = 'force-dynamic'

export default async function VerifyQueue() {
  const user = await requireFeature('verify')
  const supabase = await createClient()

  // Pull pending transactions plus any that are flagged so finance can revisit.
  const { data, error } = await supabase
    .from('fin_transactions')
    .select(`
      id, transaction_date, entry_type, amount, currency,
      from_account_id, to_account_id, vendor_payee, description,
      requisitioner, notes, receipt_url, receipt_filename,
      submitted_by, submitted_at, status,
      fin_accounts_from:fin_accounts!fin_transactions_from_account_id_fkey(name, currency),
      fin_accounts_to:fin_accounts!fin_transactions_to_account_id_fkey(name, currency)
    `)
    .in('status', ['pending', 'flagged'])
    .order('submitted_at', { ascending: true })

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Failed to load verification queue: {error.message}
      </div>
    )
  }

  const rows = ((data ?? []) as unknown as PendingRow[])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Verify pending transactions</h1>
        <p className="text-sm text-gray-600 mt-1">
          Submissions from ops users wait here until you approve or flag them.
          Approving sets the transaction to <span className="font-medium">verified</span> and counts it in reports.
          Flagging sends it back to ops for correction.
        </p>
      </div>

      <VerifyList rows={rows} verifierEmail={user.email ?? ''} />
    </div>
  )
}
