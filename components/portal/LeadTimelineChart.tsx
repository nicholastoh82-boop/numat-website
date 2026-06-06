// components/portal/LeadTimelineChart.tsx
//
// One consolidated Gantt for the portal. One row per lead, a single shared
// time axis across the top, stage segments coloured by stage, and sample
// milestones (requested / sent / received) drawn as markers on the same row.
// A filter switches between progressed leads, sample leads, won, etc.

'use client';

import { useEffect, useMemo, useState } from 'react';

type Stage = { stage: string; entered_at: string; source: string };
type Sample = { request_no: string | null; requested_at: string | null; sent_at: string | null; received_at: string | null; status: string | null };
type Lead = {
  id: string; name: string; company: string | null; country: string | null;
  current_stage: string | null; rep: string | null;
  deal_value_php: number | null; deal_value_usd: number | null;
  has_sample: boolean; stages: Stage[]; samples: Sample[];
};

const STAGE_ORDER = ['new', 'contacted', 'qualified', 'proposal_sent', 'meeting_booked', 'negotiation', 'won', 'lost'];
const STAGE_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified', proposal_sent: 'Proposal Sent',
  meeting_booked: 'Meeting Booked', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};
const STAGE_COLORS: Record<string, string> = {
  new: '#94a3b8', contacted: '#60a5fa', qualified: '#818cf8', proposal_sent: '#a78bfa',
  meeting_booked: '#22d3ee', negotiation: '#fbbf24', won: '#34d399', lost: '#f87171',
};

function parse(d: string | null): number | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : t;
}
function fmt(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const DAY = 86400000;

type FilterKey = 'all' | 'samples' | 'won' | 'qualified' | 'proposal_sent';

export default function LeadTimelineChart() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        const res = await fetch('/api/crm/timeline_overview', { cache: 'no-store' });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'failed to load');
        setLeads(json.leads || []);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return leads;
    if (filter === 'samples') return leads.filter((l) => l.has_sample);
    return leads.filter((l) => l.current_stage === filter);
  }, [leads, filter]);

  // Shared time axis bounds across all visible leads
  const { minT, maxT } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    const now = Date.now();
    for (const l of filtered) {
      for (const s of l.stages) {
        const t = parse(s.entered_at);
        if (t !== null) { lo = Math.min(lo, t); hi = Math.max(hi, t); }
      }
      for (const sm of l.samples) {
        for (const d of [sm.requested_at, sm.sent_at, sm.received_at]) {
          const t = parse(d);
          if (t !== null) { lo = Math.min(lo, t); hi = Math.max(hi, t); }
        }
      }
    }
    if (!isFinite(lo)) { lo = now - 30 * DAY; hi = now; }
    hi = Math.max(hi, now); // extend open stages to today
    const pad = Math.max(DAY, (hi - lo) * 0.02);
    return { minT: lo - pad, maxT: hi + pad };
  }, [filtered]);

  const span = Math.max(1, maxT - minT);
  const pct = (t: number) => ((t - minT) / span) * 100;

  // Month gridlines
  const monthTicks = useMemo(() => {
    const ticks: { t: number; label: string }[] = [];
    const start = new Date(minT);
    start.setDate(1); start.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d.getTime() <= maxT; d.setMonth(d.getMonth() + 1)) {
      const t = d.getTime();
      if (t >= minT) ticks.push({ t, label: d.toLocaleString('en', { month: 'short', year: '2-digit' }) });
    }
    return ticks;
  }, [minT, maxT]);

  if (loading) return <div className="text-sm text-gray-500">Loading timeline...</div>;
  if (err) return <div className="text-sm text-red-600">{err}</div>;

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All progressed (${leads.length})` },
    { key: 'samples', label: `With samples (${leads.filter((l) => l.has_sample).length})` },
    { key: 'won', label: `Won (${leads.filter((l) => l.current_stage === 'won').length})` },
    { key: 'qualified', label: `Qualified (${leads.filter((l) => l.current_stage === 'qualified').length})` },
    { key: 'proposal_sent', label: `Proposal (${leads.filter((l) => l.current_stage === 'proposal_sent').length})` },
  ];

  // Pipeline value summary across the leads currently in view
  const peso = (n: number) => '₱' + Math.round(n).toLocaleString();
  const sumPhp = (rows: Lead[]) => rows.reduce((t, l) => t + (Number(l.deal_value_php) || 0), 0);
  const openStages = ['qualified', 'proposal_sent', 'meeting_booked', 'negotiation'];
  const totalPipeline = sumPhp(filtered);
  const wonValue = sumPhp(filtered.filter((l) => l.current_stage === 'won'));
  const openValue = sumPhp(filtered.filter((l) => l.current_stage && openStages.includes(l.current_stage)));
  const valuedCount = filtered.filter((l) => Number(l.deal_value_php) > 0).length;

  return (
    <div className="space-y-4">
      {/* Pipeline value summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Total pipeline (in view)</div>
          <div className="text-lg font-semibold text-gray-900">{peso(totalPipeline)}</div>
          <div className="text-[10px] text-gray-400">{valuedCount} of {filtered.length} leads have a value</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Open pipeline</div>
          <div className="text-lg font-semibold text-indigo-700">{peso(openValue)}</div>
          <div className="text-[10px] text-gray-400">Qualified to negotiation</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Won value</div>
          <div className="text-lg font-semibold text-emerald-700">{peso(wonValue)}</div>
          <div className="text-[10px] text-gray-400">Closed won (in view)</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Leads in view</div>
          <div className="text-lg font-semibold text-gray-900">{filtered.length}</div>
          <div className="text-[10px] text-gray-400">Change with the filter below</div>
        </div>
      </div>

      {/* Filter + legend */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              filter === f.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {STAGE_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: STAGE_COLORS[s] }} />
            {STAGE_LABELS[s]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-emerald-600 bg-white" />
          Sample milestone
        </span>
      </div>

      {filtered.length === 0 && <div className="text-sm text-gray-500">No leads in this view.</div>}

      {filtered.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Axis header */}
          <div className="flex bg-gray-50 border-b border-gray-200">
            <div className="w-48 shrink-0 px-3 py-2 text-xs font-semibold text-gray-500">Lead</div>
            <div className="relative flex-1 h-8">
              {monthTicks.map((m, i) => (
                <div key={i} className="absolute top-0 h-full border-l border-gray-200" style={{ left: `${pct(m.t)}%` }}>
                  <span className="absolute top-1.5 left-1 text-[10px] text-gray-400 whitespace-nowrap">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="max-h-[600px] overflow-y-auto">
            {filtered.map((l, idx) => {
              const segments = l.stages.map((s, i) => {
                const start = parse(s.entered_at);
                if (start === null) return null;
                const nextStart = i < l.stages.length - 1 ? parse(l.stages[i + 1].entered_at) : null;
                const isTerminal = ['won', 'lost'].includes(s.stage);
                const end = nextStart ?? (isTerminal ? start + DAY : Date.now());
                return { stage: s.stage, start, end, source: s.source, isOpen: i === l.stages.length - 1 && !isTerminal };
              }).filter(Boolean) as { stage: string; start: number; end: number; source: string; isOpen: boolean }[];

              return (
                <div key={l.id} className={`flex items-stretch ${idx % 2 ? 'bg-white' : 'bg-gray-50/40'} border-b border-gray-100`}>
                  <div className="w-48 shrink-0 px-3 py-2">
                    <div className="text-xs font-medium text-gray-900 truncate" title={l.name}>{l.name}</div>
                    <div className="text-[10px] text-gray-500 truncate" title={l.company || ''}>
                      {l.company || '-'}{l.country ? ` · ${l.country}` : ''}
                    </div>
                    {Number(l.deal_value_php) > 0 && (
                      <div className="text-[10px] font-medium text-gray-700 mt-0.5">{peso(Number(l.deal_value_php))}</div>
                    )}
                  </div>
                  <div className="relative flex-1 my-2 mr-3" style={{ minHeight: 22 }}>
                    {/* month gridlines */}
                    {monthTicks.map((m, i) => (
                      <div key={i} className="absolute top-0 h-full border-l border-gray-100" style={{ left: `${pct(m.t)}%` }} />
                    ))}
                    {/* stage segments */}
                    {segments.map((seg, i) => {
                      const left = pct(seg.start);
                      const width = Math.max(0.6, pct(seg.end) - left);
                      const days = Math.round((seg.end - seg.start) / DAY);
                      return (
                        <div key={i} title={`${STAGE_LABELS[seg.stage] || seg.stage}: ${fmt(seg.start)}${seg.isOpen ? ' to now' : ''} (${days}d)${seg.source === 'reconstructed' ? ' · est.' : ''}`}
                          className="absolute top-1 h-4 rounded"
                          style={{ left: `${left}%`, width: `${width}%`, background: STAGE_COLORS[seg.stage] || '#94a3b8', opacity: seg.isOpen ? 0.55 : 1 }} />
                      );
                    })}
                    {/* sample markers */}
                    {l.samples.flatMap((sm, si) =>
                      ([['requested_at', sm.requested_at], ['sent_at', sm.sent_at], ['received_at', sm.received_at]] as const)
                        .map(([k, d]) => {
                          const t = parse(d);
                          if (t === null) return null;
                          return (
                            <div key={`${si}-${k}`} title={`Sample ${k.replace('_at', '')}: ${fmt(t)}${sm.request_no ? ` (${sm.request_no})` : ''}`}
                              className="absolute w-2.5 h-2.5 rounded-full bg-white border-2 border-emerald-600"
                              style={{ left: `calc(${pct(t)}% - 5px)`, top: 5 }} />
                          );
                        }).filter(Boolean)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Bars show days spent in each stage. Faded bars are the current open stage. Stages reconstructed from past activity
        dates are marked est. on hover. Green rings mark sample requested, sent, and received dates.
      </p>
    </div>
  );
}
