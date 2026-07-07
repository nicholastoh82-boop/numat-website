/* components/portal/SentEmailsByDate.tsx
   Lets a rep pick a date and see the actual emails that went out that day.
   Fetches /api/crm/sent-emails, which is scoped server side: admin and ceo can
   see every rep, everyone else with the productivity feature (for example
   Erica) sees only their own sends. Times are shown in Malaysia time. White
   background to match the portal finance surfaces. */

'use client';

import { useCallback, useEffect, useState } from 'react';

type SentEmail = {
  id: string;
  rep_email: string;
  subject: string | null;
  to_email: string | null;
  snippet: string | null;
  has_attachments: boolean | null;
  sent_at: string;
  lead_id: string | null;
};

type ApiResponse = {
  date: string;
  scope: 'all' | 'self';
  rep: string | null;
  count: number;
  emails: SentEmail[];
};

// Today in the browser local zone, which is Malaysia time for the team.
function todayLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function prettyDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function timeMyt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kuala_Lumpur',
  });
}

export default function SentEmailsByDate() {
  const [date, setDate] = useState<string>(todayLocal());
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/sent-emails?date=${encodeURIComponent(d)}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const showRep = data?.scope === 'all';
  const emails = data?.emails ?? [];

  const navBtn =
    'px-3 py-1.5 text-sm rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Sent emails by date</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Emails that went out on the selected day. Times shown in Malaysia time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDate((d) => shiftDate(d, -1))} className={navBtn}>
            Prev
          </button>
          <input
            type="date"
            value={date}
            max={todayLocal()}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-900"
          />
          <button
            type="button"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            disabled={date >= todayLocal()}
            className={`${navBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Next
          </button>
          <button type="button" onClick={() => setDate(todayLocal())} className={navBtn}>
            Today
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>}
      {error && <p className="text-sm text-red-700 py-6 text-center">{error}</p>}

      {!loading && !error && data && (
        <>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{data.count}</span>{' '}
            {data.count === 1 ? 'email' : 'emails'} sent on {prettyDate(data.date)}
            {data.scope === 'self' ? ' by you' : ''}.
          </p>

          {emails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-gray-700 border border-gray-200 bg-gray-50 px-3 py-2 whitespace-nowrap">
                      Time
                    </th>
                    {showRep && (
                      <th className="text-left font-semibold text-gray-700 border border-gray-200 bg-gray-50 px-3 py-2 whitespace-nowrap">
                        Rep
                      </th>
                    )}
                    <th className="text-left font-semibold text-gray-700 border border-gray-200 bg-gray-50 px-3 py-2">
                      Subject
                    </th>
                    <th className="text-left font-semibold text-gray-700 border border-gray-200 bg-gray-50 px-3 py-2">
                      To
                    </th>
                    <th className="text-left font-semibold text-gray-700 border border-gray-200 bg-gray-50 px-3 py-2 whitespace-nowrap">
                      Attachment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((m) => (
                    <tr key={m.id} className="align-top">
                      <td className="border border-gray-200 px-3 py-2 text-gray-700 tabular-nums whitespace-nowrap">
                        {timeMyt(m.sent_at)}
                      </td>
                      {showRep && (
                        <td className="border border-gray-200 px-3 py-2 text-gray-700 whitespace-nowrap">
                          {m.rep_email}
                        </td>
                      )}
                      <td className="border border-gray-200 px-3 py-2 text-gray-900">
                        <div className="font-medium">{m.subject || '(no subject)'}</div>
                        {m.snippet && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.snippet}</div>}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-700 break-all">{m.to_email || ''}</td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-700">
                        {m.has_attachments ? (
                          <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Yes</span>
                        ) : (
                          ''
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">No emails sent on this date.</p>
          )}
        </>
      )}
    </div>
  );
}
