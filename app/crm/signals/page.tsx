'use client';

// app/crm/signals/page.tsx
//
// Buying signal dashboard. Shows leads the radar flagged hot or warm, with the
// evidence and a one-click action to generate an outreach draft. Routed by rep:
// PH reps see PH leads, international reps see the rest, admins see all.

import { useEffect, useState } from 'react';

type Evidence = { description?: string; source_url?: string };

type SignalLead = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  segment: string | null;
  business_description: string | null;
  icp_fit_score: number | null;
  buying_signal_strength: string | null;
  buying_signal_summary: string | null;
  buying_signal_evidence: Evidence[] | null;
  buying_signal_detected_at: string | null;
  rep_email: string | null;
  rep_assigned: string | null;
  has_draft: boolean;
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalLead[]>([]);
  const [strength, setStrength] = useState<'all' | 'hot' | 'warm'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [strength]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/signals?strength=${strength}&limit=100`, {
        credentials: 'include',
      });
      if (res.status === 403) throw new Error('Sign in to a CRM account to view this page.');
      if (!res.ok) throw new Error(`Load failed: ${res.status}`);
      const data = (await res.json()) as { signals: SignalLead[] };
      setSignals(data.signals);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const hotCount = signals.filter((s) => s.buying_signal_strength === 'hot').length;
  const warmCount = signals.filter((s) => s.buying_signal_strength === 'warm').length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Buying Signals</h1>
            <p className="text-sm text-slate-600">
              Leads our radar flagged as actively in market. Reach out while the signal is fresh.
            </p>
          </div>
          <a
            href="/crm/outreach"
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-sm font-medium hover:bg-slate-200 whitespace-nowrap"
          >
            Outreach drafts →
          </a>
        </header>

        <div className="flex items-center gap-2 mb-4">
          {(['all', 'hot', 'warm'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStrength(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                strength === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? `All (${signals.length})` : s === 'hot' ? `Hot (${hotCount})` : `Warm (${warmCount})`}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto px-3 py-1.5 rounded text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-500">Loading...</div>
        ) : signals.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm">
            No fresh buying signals right now. The radar scans high-fit leads daily; check back
            tomorrow.
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SignalCard({ signal: s }: { signal: SignalLead }) {
  const isHot = s.buying_signal_strength === 'hot';
  const badge = isHot ? 'bg-red-100 text-red-900 border-red-300' : 'bg-amber-100 text-amber-900 border-amber-300';
  const emoji = isHot ? '🔥' : '📈';
  const evidence = Array.isArray(s.buying_signal_evidence) ? s.buying_signal_evidence : [];

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${badge}`}>
              {emoji} {(s.buying_signal_strength ?? '').toUpperCase()}
            </span>
            <span className="font-semibold text-slate-900">{s.company || 'Unknown company'}</span>
            {s.icp_fit_score != null && (
              <span className="text-xs text-slate-500">ICP {s.icp_fit_score}</span>
            )}
            {s.has_draft && (
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800">
                draft exists
              </span>
            )}
          </div>
          <div className="text-sm text-slate-700 mt-1">
            {s.full_name || '(no contact name)'}
            {s.email ? ` · ${s.email}` : ''}
            {s.country ? ` · ${s.country}` : ''}
            {s.city ? `, ${s.city}` : ''}
          </div>
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap">
          {s.buying_signal_detected_at
            ? new Date(s.buying_signal_detected_at).toLocaleDateString()
            : ''}
        </div>
      </div>

      {s.buying_signal_summary && (
        <div className="mt-2 text-sm text-slate-800 bg-slate-50 rounded p-2">
          {s.buying_signal_summary}
        </div>
      )}

      {evidence.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-semibold text-slate-500 mb-1">Evidence</div>
          <ul className="space-y-1">
            {evidence.slice(0, 3).map((e, i) => (
              <li key={i} className="text-xs text-slate-600">
                {e.description}{' '}
                {e.source_url && (
                  <a
                    href={e.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    source
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-slate-500">
          Assigned: {s.rep_assigned || s.rep_email || 'unassigned'}
        </span>
      </div>
    </div>
  );
}
