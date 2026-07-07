/* components/portal/SentEmailsByDate.tsx
   Lets a rep pick a date and see the actual emails that went out that day.
   Fetches /api/crm/sent-emails, which is scoped server side: admin and ceo can
   see every rep, everyone else with the productivity feature (for example
   Erica) sees only their own sends. Times are shown in Malaysia time.

   Mobile first: each email renders as a stacked card so a long recipient
   address wraps cleanly inside a full width card instead of being crushed into
   a narrow table column on a phone. White background to match the portal
   finance surfaces. */

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

  const isToday = date >= todayLocal();
  const showRep = data?.scope === 'all';
  const emails = data?.emails ?? [];

  const btn =
    'shrink-0 px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      {/* Header and date controls */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Sent emails by date</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Emails that went out on the selected day. Times shown in Malaysia time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Previous day" onClick={() => setDate((d) => shiftDate(d, -1))} className={btn}>
            Prev
          </button>
          <input
            type="date"
            value={date}
            max={todayLocal()}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 min-w-[8rem] px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-900"
          />
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            disabled={isToday}
            className={`${btn} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setDate(todayLocal())}
            disabled={isToday}
            className={`${btn} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
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
            <ul className="space-y-2">
              {emails.map((m) => (
                <li key={m.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500 tabular-nums">{timeMyt(m.sent_at)}</span>
                    {m.has_attachments && (
                      <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Attachment</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900 break-words">{m.subject || '(no subject)'}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    <span className="text-gray-400">To </span>
                    <span className="break-all">{m.to_email || '(unknown)'}</span>
                  </div>
                  {showRep && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      <span className="text-gray-400">Rep </span>
                      <span className="break-all">{m.rep_email}</span>
                    </div>
                  )}
                  {m.snippet && <p className="mt-1 text-xs text-gray-500 truncate">{m.snippet}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">No emails sent on this date.</p>
          )}
        </>
      )}
    </div>
  );
}
