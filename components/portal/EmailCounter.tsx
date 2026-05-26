/* components/portal/EmailCounter.tsx
   Email productivity counter. Fetches /api/crm/email-stats which is scoped by
   role server side: admin and ceo see every rep, sales reps see only their own.
   Toggle between a daily view (last 30 days) and a monthly view (last 12
   months). White background to match portal finance surfaces. */

'use client';

import { useEffect, useState, useCallback } from 'react';

type RepTotal = { rep_email: string; rep_name: string; sent: number; replies: number };
type StatRow = { rep_email: string; rep_name: string; bucket: string; sent: number; replies: number };
type ApiResponse = {
  granularity: 'day' | 'month';
  scope: 'all' | 'self';
  reps: RepTotal[];
  rows: StatRow[];
  totals: { sent: number; replies: number };
};

function formatBucket(bucket: string, granularity: 'day' | 'month'): string {
  if (granularity === 'month') {
    const [y, m] = bucket.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  const [y, m, d] = bucket.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function EmailCounter() {
  const [granularity, setGranularity] = useState<'day' | 'month'>('day');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (g: 'day' | 'month') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/email-stats?granularity=${g}`, { cache: 'no-store' });
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
    load(granularity);
  }, [granularity, load]);

  // Order buckets newest first; rows already arrive that way but sort to be safe.
  const buckets = data ? Array.from(new Set(data.rows.map((r) => r.bucket))).sort((a, b) => (a < b ? 1 : -1)) : [];
  const reps = data?.reps ?? [];

  const cellFor = (bucket: string, repEmail: string) =>
    data?.rows.find((r) => r.bucket === bucket && r.rep_email === repEmail) ?? null;

  const tabBtn = (g: 'day' | 'month', label: string) => (
    <button
      onClick={() => setGranularity(g)}
      className={
        'px-3 py-1.5 text-sm rounded-md border transition-colors ' +
        (granularity === g
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
      }
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Email Counter</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {data?.scope === 'self' ? 'Your own activity' : 'All reps'} · sends and replies from every account
          </p>
        </div>
        <div className="flex gap-2">
          {tabBtn('day', 'By day')}
          {tabBtn('month', 'By month')}
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>}
      {error && <p className="text-sm text-red-700 py-6 text-center">{error}</p>}

      {!loading && !error && data && (
        <>
          {/* Totals per rep */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reps.length === 0 && (
              <p className="text-sm text-gray-500">No email activity in this window.</p>
            )}
            {reps.map((r) => (
              <div key={r.rep_email} className="rounded-md border border-gray-200 p-3">
                <div className="text-sm font-medium text-gray-900">{r.rep_name}</div>
                <div className="mt-1 flex gap-4">
                  <div>
                    <div className="text-xl font-semibold text-gray-900">{r.sent}</div>
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Sent</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-emerald-700">{r.replies}</div>
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Replies</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Per bucket breakdown */}
          {buckets.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-gray-700 border border-gray-200 bg-gray-50 px-3 py-2">
                      {granularity === 'month' ? 'Month' : 'Day'}
                    </th>
                    {reps.map((r) => (
                      <th
                        key={r.rep_email}
                        className="text-center font-semibold text-gray-700 border border-gray-200 bg-gray-50 px-3 py-2"
                        colSpan={2}
                      >
                        {r.rep_name}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 px-3 py-1"></th>
                    {reps.map((r) => (
                      <th key={r.rep_email + '-sub'} className="border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-500 font-normal text-center" colSpan={2}>
                        <span className="inline-block w-12">Sent</span>
                        <span className="inline-block w-12">Replies</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => (
                    <tr key={b}>
                      <td className="border border-gray-200 px-3 py-1.5 text-gray-700 whitespace-nowrap">
                        {formatBucket(b, granularity)}
                      </td>
                      {reps.map((r) => {
                        const c = cellFor(b, r.rep_email);
                        return (
                          <td key={r.rep_email + b} className="border border-gray-200 px-2 py-1.5 text-center" colSpan={2}>
                            <span className="inline-block w-12 text-gray-900">{c?.sent ?? 0}</span>
                            <span className="inline-block w-12 text-emerald-700">{c?.replies ?? 0}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
