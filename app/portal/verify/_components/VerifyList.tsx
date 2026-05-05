/* app/portal/verify/_components/VerifyList.tsx
   Client component. Renders pending transactions with approve and flag actions.
   Uses the browser Supabase client. RLS ensures only admin/finance can update. */

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PendingRow = {
  id: string
  transaction_date: string
  entry_type: string
  amount: number
  currency: string
  from_account_id: string | null
  to_account_id: string | null
  vendor_payee: string | null
  description: string | null
  requisitioner: string | null
  notes: string | null
  receipt_url: string | null
  receipt_filename: string | null
  submitted_by: string | null
  submitted_at: string | null
  status: 'pending' | 'flagged' | string
  fin_accounts_from: { name: string; currency: string } | null
  fin_accounts_to: { name: string; currency: string } | null
}

type Props = {
  rows: PendingRow[]
  verifierEmail: string
}

export default function VerifyList({ rows, verifierEmail }: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flaggingId, setFlaggingId] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState('')

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Nothing to verify. The queue is empty.
      </div>
    )
  }

  const supabase = createClient()

  async function approve(row: PendingRow) {
    setBusyId(row.id)
    setError(null)
    const { error: e } = await supabase
      .from('fin_transactions')
      .update({
        status: 'verified',
        verified_by: verifierEmail,
        verified_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    setBusyId(null)
    if (e) {
      setError(`Approve failed: ${e.message}`)
      return
    }
    router.refresh()
  }

  async function flag(row: PendingRow, reason: string) {
    if (!reason.trim()) {
      setError('Please give a reason when flagging.')
      return
    }
    setBusyId(row.id)
    setError(null)
    const existingNotes = row.notes ? `${row.notes}\n\n` : ''
    const flagNote = `[FLAGGED ${new Date().toISOString().slice(0, 10)} by ${verifierEmail}]: ${reason.trim()}`
    const { error: e } = await supabase
      .from('fin_transactions')
      .update({
        status: 'flagged',
        notes: `${existingNotes}${flagNote}`,
      })
      .eq('id', row.id)
    setBusyId(null)
    setFlaggingId(null)
    setFlagReason('')
    if (e) {
      setError(`Flag failed: ${e.message}`)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500">
        {rows.length} item{rows.length === 1 ? '' : 's'} awaiting your review
      </div>

      {rows.map((row) => {
        const fromAcc = row.fin_accounts_from
        const toAcc = row.fin_accounts_to
        const isPending = row.status === 'pending'
        const isFlagged = row.status === 'flagged'
        return (
          <div
            key={row.id}
            className={`rounded-lg border bg-white ${
              isFlagged ? 'border-amber-300' : 'border-gray-200'
            }`}
          >
            <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    isFlagged
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {row.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {row.entry_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {row.transaction_date}
                  </span>
                </div>

                <div className="text-base font-semibold text-gray-900">
                  {row.currency} {Number(row.amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>

                <div className="text-sm text-gray-700">
                  {row.vendor_payee ? <span className="font-medium">{row.vendor_payee}</span> : null}
                  {row.vendor_payee && row.description ? ' , ' : null}
                  {row.description}
                </div>

                <div className="text-xs text-gray-500">
                  {fromAcc && <>From: <span className="text-gray-700">{fromAcc.name}</span> </>}
                  {toAcc && <>To: <span className="text-gray-700">{toAcc.name}</span> </>}
                  {row.requisitioner && <>, Requested by {row.requisitioner} </>}
                </div>

                <div className="text-xs text-gray-400">
                  Submitted by {row.submitted_by ?? 'unknown'}
                  {row.submitted_at ? ` on ${new Date(row.submitted_at).toLocaleString()}` : ''}
                </div>

                {row.notes && (
                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2 mt-2 whitespace-pre-wrap">
                    {row.notes}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0 min-w-[120px]">
                {row.receipt_url && (
                  <a
                    href={row.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 text-center"
                  >
                    View receipt
                  </a>
                )}
                {isPending && (
                  <>
                    <button
                      onClick={() => approve(row)}
                      disabled={busyId === row.id}
                      className="text-xs px-3 py-1.5 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
                    >
                      {busyId === row.id ? 'Working' : 'Approve'}
                    </button>
                    <button
                      onClick={() => { setFlaggingId(row.id); setFlagReason('') }}
                      disabled={busyId === row.id}
                      className="text-xs px-3 py-1.5 rounded border border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Flag
                    </button>
                  </>
                )}
              </div>
            </div>

            {flaggingId === row.id && (
              <div className="border-t border-gray-200 bg-amber-50 px-5 py-3 space-y-2">
                <label className="block text-xs font-medium text-amber-900">
                  Reason for flagging (will be saved to notes for ops to read)
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Receipt photo unreadable, please re-upload"
                  className="w-full border border-amber-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => flag(row, flagReason)}
                    disabled={busyId === row.id || !flagReason.trim()}
                    className="text-xs px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {busyId === row.id ? 'Working' : 'Confirm flag'}
                  </button>
                  <button
                    onClick={() => { setFlaggingId(null); setFlagReason('') }}
                    className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
