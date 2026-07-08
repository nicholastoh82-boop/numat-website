/* app/portal/(authed)/ceo/_components/RepEmailKpis.tsx
   Per rep email KPI summary for the CEO dashboard. Rows come from the
   v_rep_email_kpis Supabase view (CRM email activity in crm_emails), loaded
   server side in page.tsx and passed through the dashboard data payload. This
   replaces the old per day email table. It is intentionally separate from the
   sequence_events based tracking. White background to match the portal finance
   surfaces. Active reps render first, past reps render greyed under their own
   heading using the rep_active flag. */

type RepKpi = {
  rep_email: string
  rep_name: string | null
  rep_active: boolean
  total_sent: number | string | null
  sent_24h: number | string | null
  sent_7d: number | string | null
  sent_30d: number | string | null
  leads_contacted: number | string | null
  total_received: number | string | null
  received_7d: number | string | null
  leads_replied: number | string | null
  reply_rate_pct: number | string | null
  last_sent_at: string | null
}

// bigint columns can arrive as numbers or strings from the API, so coerce.
function num(n: number | string | null | undefined): string {
  return Number(n || 0).toLocaleString('en-US')
}

// reply_rate_pct is numeric and may arrive as a string. It is already a
// percentage (leads_replied over leads_contacted), so format to one decimal.
function pct(n: number | string | null | undefined): string {
  return Number(n || 0).toFixed(1) + '%'
}

function lastSent(s: string | null | undefined): string {
  if (!s) return 'Never'
  const d = new Date(s)
  if (isNaN(d.getTime())) return 'Never'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const HEADERS: { key: string; label: string; right: boolean }[] = [
  { key: 'rep', label: 'Rep', right: false },
  { key: 'sent_7d', label: 'Sent (7d)', right: true },
  { key: 'sent_30d', label: 'Sent (30d)', right: true },
  { key: 'total_sent', label: 'Total sent', right: true },
  { key: 'leads_contacted', label: 'Leads contacted', right: true },
  { key: 'replies', label: 'Replies', right: true },
  { key: 'reply_rate', label: 'Reply rate', right: true },
  { key: 'last_sent', label: 'Last sent', right: false },
]

function RepRow({ r, muted }: { r: RepKpi; muted?: boolean }) {
  const name = r.rep_name || r.rep_email
  const cell = 'border border-gray-200 px-3 py-2 whitespace-nowrap'
  const text = muted ? 'text-gray-400' : 'text-gray-900'
  const replies = muted ? 'text-gray-400' : 'text-emerald-700'
  const sub = muted ? 'text-gray-400' : 'text-gray-500'
  const date = muted ? 'text-gray-400' : 'text-gray-700'
  return (
    <tr>
      <td className={`${cell} ${text}`}>
        <div className="font-medium">{name}</div>
        <div className={`text-[11px] ${sub}`}>{r.rep_email}</div>
      </td>
      <td className={`${cell} text-right tabular-nums ${text}`}>{num(r.sent_7d)}</td>
      <td className={`${cell} text-right tabular-nums ${text}`}>{num(r.sent_30d)}</td>
      <td className={`${cell} text-right tabular-nums ${text}`}>{num(r.total_sent)}</td>
      <td className={`${cell} text-right tabular-nums ${text}`}>{num(r.leads_contacted)}</td>
      <td className={`${cell} text-right tabular-nums ${replies}`}>{num(r.leads_replied)}</td>
      <td className={`${cell} text-right tabular-nums ${text}`}>{pct(r.reply_rate_pct)}</td>
      <td className={`${cell} ${date}`}>{lastSent(r.last_sent_at)}</td>
    </tr>
  )
}

export default function RepEmailKpis({ rows }: { rows: RepKpi[] }) {
  const list = Array.isArray(rows) ? rows : []
  const active = list.filter((r) => r.rep_active)
  const past = list.filter((r) => !r.rep_active)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Email KPIs by rep</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Sends and replies from CRM email activity. Active reps first.
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">No rep email activity to show.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {HEADERS.map((h) => (
                  <th
                    key={h.key}
                    className={`${h.right ? 'text-right' : 'text-left'} font-semibold text-gray-700 border border-gray-200 bg-gray-50 px-3 py-2`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((r) => (
                <RepRow key={r.rep_email} r={r} />
              ))}
              {past.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={HEADERS.length}
                      className="border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] uppercase tracking-wide font-semibold text-gray-500"
                    >
                      Past reps
                    </td>
                  </tr>
                  {past.map((r) => (
                    <RepRow key={r.rep_email} r={r} muted />
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
