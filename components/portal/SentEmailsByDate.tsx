/* components/portal/SentEmailsByDate.tsx
   Lets a rep pick a date, see the emails that went out that day, and tap any
   email to read its full content. The list is fetched from
   /api/crm/sent-emails?date=..., and a single email's body is fetched on demand
   from /api/crm/sent-emails?id=... when a card is expanded, so the list stays
   light. Both are scoped server side: admin and ceo see every rep, everyone
   else with the productivity feature sees only their own sends.

   The body is rendered inside a sandboxed frame (no scripts can run) so it
   looks the way it was sent, with a plain text fallback. White background to
   match the portal finance surfaces. */

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

type EmailDetail = {
  id: string;
  rep_email: string;
  subject: string | null;
  from_email: string | null;
  to_email: string | null;
  cc: string | null;
  sent_at: string;
  has_attachments: boolean | null;
  attachment_meta: unknown;
  body_text: string | null;
  body_html: string | null;
  gmail_thread_id: string | null;
};

type ApiResponse = {
  date: string;
  scope: 'all' | 'self';
  rep: string | null;
  count: number;
  emails: SentEmail[];
};

type DetailState = { loading: boolean; error: string | null; email: EmailDetail | null };

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

// Pull a readable list of attachment names from attachment_meta, whatever shape
// it happens to be, without assuming a strict schema.
function attachmentNames(meta: unknown): string[] {
  if (!Array.isArray(meta)) return [];
  return meta
    .map((a) => {
      if (a && typeof a === 'object') {
        const o = a as Record<string, unknown>;
        const name = o.filename || o.name || o.title;
        if (typeof name === 'string') return name;
      }
      return '';
    })
    .filter(Boolean) as string[];
}

export default function SentEmailsByDate() {
  const [date, setDate] = useState<string>(todayLocal());
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    setOpenId(null);
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

  const fetchDetail = useCallback(async (id: string) => {
    setDetails((c) => ({ ...c, [id]: { loading: true, error: null, email: null } }));
    try {
      const res = await fetch(`/api/crm/sent-emails?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      setDetails((c) => ({ ...c, [id]: { loading: false, error: null, email: json.email } }));
    } catch (e) {
      setDetails((c) => ({ ...c, [id]: { loading: false, error: e instanceof Error ? e.message : 'Failed to load', email: null } }));
    }
  }, []);

  const toggle = (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!details[id] || (!details[id].email && !details[id].loading)) {
      fetchDetail(id);
    }
  };

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
            Emails that went out on the selected day. Tap an email to read it. Times shown in Malaysia time.
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
              {emails.map((m) => {
                const isOpen = openId === m.id;
                const detail = details[m.id];
                return (
                  <li key={m.id} className="rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-expanded={isOpen}
                      className="w-full text-left p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-500 tabular-nums">{timeMyt(m.sent_at)}</span>
                        <div className="flex items-center gap-2">
                          {m.has_attachments && (
                            <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Attachment</span>
                          )}
                          <span className="shrink-0 text-gray-400 text-xs">{isOpen ? '▾' : '▸'}</span>
                        </div>
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
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2">
                        {detail?.loading && <p className="text-xs text-gray-500 py-4 text-center">Loading content…</p>}
                        {detail?.error && <p className="text-xs text-red-700 py-4 text-center">{detail.error}</p>}
                        {detail?.email && (
                          <>
                            <div className="text-xs text-gray-600 space-y-0.5">
                              {detail.email.from_email && (
                                <div>
                                  <span className="text-gray-400">From </span>
                                  <span className="break-all">{detail.email.from_email}</span>
                                </div>
                              )}
                              {detail.email.cc && (
                                <div>
                                  <span className="text-gray-400">Cc </span>
                                  <span className="break-all">{detail.email.cc}</span>
                                </div>
                              )}
                              {attachmentNames(detail.email.attachment_meta).length > 0 && (
                                <div>
                                  <span className="text-gray-400">Attachments </span>
                                  <span className="break-all">{attachmentNames(detail.email.attachment_meta).join(', ')}</span>
                                </div>
                              )}
                            </div>

                            {detail.email.body_html ? (
                              <iframe
                                title="Email content"
                                sandbox=""
                                srcDoc={detail.email.body_html}
                                className="w-full h-96 rounded border border-gray-200 bg-white"
                              />
                            ) : detail.email.body_text ? (
                              <div className="max-h-96 overflow-y-auto rounded border border-gray-200 bg-white p-3">
                                <pre className="whitespace-pre-wrap break-words font-sans text-xs text-gray-800">
                                  {detail.email.body_text}
                                </pre>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 py-4 text-center">No content stored for this email.</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">No emails sent on this date.</p>
          )}
        </>
      )}
    </div>
  );
}
