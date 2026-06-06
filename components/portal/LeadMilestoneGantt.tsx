'use client';

// components/portal/LeadMilestoneGantt.tsx
// A Gantt built from the milestone dates in the lead status data. Each lead is a
// bar spanning its earliest to latest milestone, with dots marking each
// milestone (email sent/received, sample requested/sent/received, quotation,
// proposal signed, due date, order completed). Shows how long each deal has been
// running and where it currently sits.

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

// Milestone definitions: key, short label, color
const MILESTONES: { key: keyof Lead; label: string; color: string }[] = [
  { key: 'last_email_sent', label: 'Email sent', color: '#60a5fa' },
  { key: 'last_email_received', label: 'Email received', color: '#818cf8' },
  { key: 'sample_requested', label: 'Sample requested', color: '#22d3ee' },
  { key: 'sample_sent', label: 'Sample sent', color: '#14b8a6' },
  { key: 'sample_received', label: 'Sample received', color: '#10b981' },
  { key: 'quotation_sent', label: 'Quotation sent', color: '#a78bfa' },
  { key: 'proposal_signed', label: 'Proposal signed', color: '#f59e0b' },
  { key: 'due_date', label: 'Due date', color: '#ef4444' },
  { key: 'order_completed', label: 'Order completed', color: '#16a34a' },
];

const STAGE_LABELS: Record<string, string> = {
  qualified: 'Qualified', proposal_sent: 'Proposal Sent', meeting_booked: 'Meeting Booked',
  negotiation: 'Negotiation', won: 'Won', lost: 'Lost', new: 'New', contacted: 'Contacted',
};

const peso = (n: number) => '₱' + Math.round(n).toLocaleString();
const DAY = 86400000;

function fmtShort(t: number) {
  const d = new Date(t);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}
function fmtMonth(t: number) {
  const d = new Date(t);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default function LeadMilestoneGantt() {
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
    const s = new Set<string>();
    leads.forEach((l) => { if (l.rep) s.add(l.rep); });
    return Array.from(s).sort();
  }, [leads]);

  // Only leads with at least one milestone date can appear on a time axis
  const datedLeads = useMemo(() => {
    return leads.filter((l) => MILESTONES.some((m) => l[m.key]));
  }, [leads]);

  const filtered = useMemo(() => {
    let rows = datedLeads;
    if (repFilter !== 'all') rows = rows.filter((l) => l.rep === repFilter);
    if (stageFilter !== 'all') rows = rows.filter((l) => l.stage === stageFilter);
    return rows;
  }, [datedLeads, repFilter, stageFilter]);

  const stageOptions = useMemo(() => {
    const order = ['qualified', 'proposal_sent', 'meeting_booked', 'negotiation', 'won', 'lost'];
    const base = repFilter === 'all' ? datedLeads : datedLeads.filter((l) => l.rep === repFilter);
    const counts = new Map<string, number>();
    base.forEach((l) => { if (l.stage) counts.set(l.stage, (counts.get(l.stage) || 0) + 1); });
    return order.filter((s) => counts.has(s)).map((s) => ({ key: s, count: counts.get(s) || 0 }));
  }, [datedLeads, repFilter]);

  // Time range across the filtered leads
  const { minT, maxT, months } = useMemo(() => {
    const times: number[] = [];
    for (const l of filtered) {
      for (const m of MILESTONES) {
        const v = l[m.key] as string | null;
        if (v) { const t = new Date(v).getTime(); if (!isNaN(t)) times.push(t); }
      }
    }
    if (times.length === 0) return { minT: 0, maxT: 0, months: [] as number[] };
    let lo = Math.min(...times);
    let hi = Math.max(...times);
    // pad 3 days each side
    lo -= 3 * DAY; hi += 3 * DAY;
    // month gridlines
    const ms: number[] = [];
    const d = new Date(lo); d.setDate(1); d.setHours(0, 0, 0, 0);
    while (d.getTime() <= hi) { ms.push(d.getTime()); d.setMonth(d.getMonth() + 1); }
    return { minT: lo, maxT: hi, months: ms };
  }, [filtered]);

  const span = Math.max(1, maxT - minT);
  const pct = (t: number) => ((t - minT) / span) * 100;

  function leadMilestones(l: Lead) {
    return MILESTONES
      .map((m) => {
        const v = l[m.key] as string | null;
        if (!v) return null;
        const t = new Date(v).getTime();
        if (isNaN(t)) return null;
        return { ...m, t };
      })
      .filter(Boolean) as { key: string; label: string; color: string; t: number }[];
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3" aria-hidden>
        <div className="h-10 bg-gray-100 rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-9 bg-gray-50 rounded" />)}
      </div>
    );
  }
  if (err) return <div className="text-sm text-red-600">{err}</div>;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {MILESTONES.map((m) => (
          <span key={m.key} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
            {m.label}
          </span>
        ))}
      </div>

      {/* Rep filter */}
      {reps.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setRepFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg border ${repFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
            All reps ({datedLeads.length})
          </button>
          {reps.map((r) => (
            <button key={r} onClick={() => setRepFilter(r)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${repFilter === r ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
              {r} ({datedLeads.filter((l) => l.rep === r).length})
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

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border border-gray-200 rounded-xl bg-white">
          No leads with milestone dates yet. As reps fill in the dates, bars will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <div className="min-w-[760px]">
            {/* Month axis */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="w-52 shrink-0 px-3 py-2 text-[11px] font-medium text-gray-500">Lead</div>
              <div className="relative flex-1 h-7">
                {months.map((m, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: `${pct(m)}%` }}>
                    <span className="absolute top-1 left-1 text-[10px] text-gray-400 whitespace-nowrap">{fmtMonth(m)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {filtered.map((l, idx) => {
              const ms = leadMilestones(l);
              const lo = Math.min(...ms.map((x) => x.t));
              const hi = Math.max(...ms.map((x) => x.t));
              return (
                <div key={l.id} className={`flex items-stretch border-b border-gray-100 last:border-0 ${idx % 2 ? 'bg-gray-50/40' : 'bg-white'}`}>
                  <div className="w-52 shrink-0 px-3 py-2">
                    <div className="text-xs font-medium text-gray-900 truncate" title={l.name}>{l.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {l.company || '-'}{Number(l.deal_value_php) > 0 ? ` · ${peso(Number(l.deal_value_php))}` : ''}
                    </div>
                  </div>
                  <div className="relative flex-1 my-2 mr-3" style={{ minHeight: 24 }}>
                    {/* month gridlines */}
                    {months.map((m, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${pct(m)}%` }} />
                    ))}
                    {/* span bar */}
                    {hi > lo && (
                      <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200"
                        style={{ left: `${pct(lo)}%`, width: `${Math.max(0.5, pct(hi) - pct(lo))}%` }} />
                    )}
                    {/* milestone dots */}
                    {ms.map((x, i) => (
                      <div key={i}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                        style={{ left: `${pct(x.t)}%`, background: x.color }}
                        title={`${x.label}: ${fmtShort(x.t)}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-[11px] text-gray-400">
        Each bar runs from a lead&apos;s first recorded date to its latest. Hover a dot to see which milestone and the date.
        Leads with no dates yet do not appear here.
      </p>
    </div>
  );
}
