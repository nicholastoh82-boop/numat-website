'use client';

// components/portal/LeadStatusTable.tsx
// Clean status table: one row per active lead, showing deal value and the key
// milestone dates so anyone can see at a glance where each live deal stands.

import { useEffect, useMemo, useState } from 'react';

type Lead = {
  id: string;
  name: string;
  company: string | null;
  country: string | null;
  stage: string | null;
  rep: string | null;
  deal_value_php: number | null;
  deal_value_usd: number | null;
  last_email_sent: string | null;
  last_email_received: string | null;
  sample_requested: string | null;
  sample_sent: string | null;
  sample_received: string | null;
  quotation_sent: string | null;
  proposal_signed: string | null;
  due_date: string | null;
  order_completed: string | null;
};

const STAGE_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified', proposal_sent: 'Proposal Sent',
  meeting_booked: 'Meeting Booked', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};
const STAGE_STYLES: Record<string, string> = {
  won: 'bg-emerald-100 text-emerald-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  proposal_sent: 'bg-amber-100 text-amber-700',
  meeting_booked: 'bg-cyan-100 text-cyan-700',
  negotiation: 'bg-orange-100 text-orange-700',
  lost: 'bg-red-100 text-red-700',
};

function fmtDate(s: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}
const peso = (n: number) => '₱' + Math.round(n).toLocaleString();

export default function LeadStatusTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [repFilter, setRepFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/crm/lead_status');
        const json = await res.json();
        if (!json.ok) { setErr(json.error || 'Failed to load'); return; }
        setLeads(json.leads as Lead[]);
      } catch {
        setErr('Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reps = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.rep) set.add(l.rep); });
    return Array.from(set).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    let rows = leads;
    if (repFilter !== 'all') rows = rows.filter((l) => l.rep === repFilter);
    if (stageFilter !== 'all') rows = rows.filter((l) => l.stage === stageFilter);
    return rows;
  }, [leads, repFilter, stageFilter]);

  // Stage options present in the data, in pipeline order, with counts (respecting the rep filter)
  const stageOptions = useMemo(() => {
    const order = ['qualified', 'proposal_sent', 'meeting_booked', 'negotiation', 'won', 'lost'];
    const base = repFilter === 'all' ? leads : leads.filter((l) => l.rep === repFilter);
    const counts = new Map<string, number>();
    base.forEach((l) => { if (l.stage) counts.set(l.stage, (counts.get(l.stage) || 0) + 1); });
    return order.filter((s) => counts.has(s)).map((s) => ({ key: s, count: counts.get(s) || 0 }));
  }, [leads, repFilter]);

  const totals = useMemo(() => {
    const sum = (rows: Lead[]) => rows.reduce((t, l) => t + (Number(l.deal_value_php) || 0), 0);
    const open = ['qualified', 'proposal_sent', 'meeting_booked', 'negotiation'];
    return {
      total: sum(filtered),
      open: sum(filtered.filter((l) => l.stage && open.includes(l.stage))),
      won: sum(filtered.filter((l) => l.stage === 'won')),
      valued: filtered.filter((l) => Number(l.deal_value_php) > 0).length,
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3" aria-hidden>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-10 bg-gray-100 rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded" />)}
      </div>
    );
  }
  if (err) return <div className="text-sm text-red-600">{err}</div>;

  const cols: { key: keyof Lead; label: string }[] = [
    { key: 'last_email_sent', label: 'Last email sent' },
    { key: 'last_email_received', label: 'Last email received' },
    { key: 'sample_requested', label: 'Sample requested' },
    { key: 'sample_sent', label: 'Sample sent' },
    { key: 'sample_received', label: 'Sample received' },
    { key: 'quotation_sent', label: 'Quotation sent' },
    { key: 'proposal_signed', label: 'Proposal signed' },
    { key: 'due_date', label: 'Due date' },
    { key: 'order_completed', label: 'Order completed' },
  ];

  return (
    <div className="space-y-4">
      {/* Deal value summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Total pipeline</div>
          <div className="text-lg font-semibold text-gray-900">{peso(totals.total)}</div>
          <div className="text-[10px] text-gray-400">{totals.valued} of {filtered.length} have a value</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Open pipeline</div>
          <div className="text-lg font-semibold text-indigo-700">{peso(totals.open)}</div>
          <div className="text-[10px] text-gray-400">Qualified to negotiation</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Won value</div>
          <div className="text-lg font-semibold text-emerald-700">{peso(totals.won)}</div>
          <div className="text-[10px] text-gray-400">Closed won</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Active leads</div>
          <div className="text-lg font-semibold text-gray-900">{filtered.length}</div>
          <div className="text-[10px] text-gray-400">Most recent first</div>
        </div>
      </div>

      {/* Rep filter */}
      {reps.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setRepFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg border ${repFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
            All reps ({leads.length})
          </button>
          {reps.map((r) => (
            <button key={r} onClick={() => setRepFilter(r)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${repFilter === r ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
              {r} ({leads.filter((l) => l.rep === r).length})
            </button>
          ))}
        </div>
      )}

      {/* Stage filter */}
      {stageOptions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-gray-400 mr-1">Stage</span>
          <button onClick={() => setStageFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg border ${stageFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
            All stages
          </button>
          {stageOptions.map((s) => (
            <button key={s.key} onClick={() => setStageFilter(s.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${stageFilter === s.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
              {STAGE_LABELS[s.key] || s.key} ({s.count})
            </button>
          ))}
        </div>
      )}

      {/* Status table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left font-medium text-gray-500 px-3 py-2.5 sticky left-0 bg-gray-50 z-10">Lead</th>
              <th className="text-left font-medium text-gray-500 px-3 py-2.5">Stage</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2.5">Deal value</th>
              {cols.map((c) => (
                <th key={c.key} className="text-left font-medium text-gray-500 px-3 py-2.5 whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, idx) => (
              <tr key={l.id} className={`border-b border-gray-100 last:border-0 ${idx % 2 ? 'bg-gray-50/40' : 'bg-white'}`}>
                <td className="px-3 py-2.5 sticky left-0 z-10 bg-inherit">
                  <div className="font-medium text-gray-900 whitespace-nowrap">{l.name}</div>
                  <div className="text-[10px] text-gray-500 whitespace-nowrap">
                    {l.company || '-'}{l.rep ? ` · ${l.rep}` : ''}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {l.stage && (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STAGE_STYLES[l.stage] || 'bg-gray-100 text-gray-600'}`}>
                      {STAGE_LABELS[l.stage] || l.stage}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap">
                  {Number(l.deal_value_php) > 0 ? peso(Number(l.deal_value_php)) : <span className="text-gray-300">—</span>}
                </td>
                {cols.map((c) => {
                  const v = fmtDate(l[c.key] as string | null);
                  return (
                    <td key={c.key} className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                      {v || <span className="text-gray-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={3 + cols.length} className="px-3 py-8 text-center text-gray-400">No leads to show.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">
        Dates are filled in by the reps as each step happens. A dash means that step has not happened yet or has not been recorded.
      </p>
    </div>
  );
}
