'use client';

// app/crm/search/page.tsx
//
// Knowledge base search UI for the CRM. Queries /api/crm/kb-search,
// which proxies to Vertex AI Search and enriches results with company
// info from master_leads.
//
// Style: white background, no hyphens or dashes per Nick's preferences.
// Tailwind utility classes only (matches the rest of the CRM).

import { useState, useEffect, useCallback } from 'react';

type SearchResult = {
  id: string;
  uuid: string | null;
  title: string;
  company: string | null;
  full_name: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  icp_fit_score: number | null;
  buying_signal_strength: string | null;
  buying_signal_summary: string | null;
  rep_email: string | null;
  enrichment_tier: string | null;
  snippet: string;
  link: string | null;
};

const SIGNAL_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700 border-red-200',
  warm: 'bg-orange-100 text-orange-700 border-orange-200',
  cold: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ICP_BADGE = (score: number | null): string => {
  if (score === null) return 'bg-slate-100 text-slate-600';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
};

export default function CrmSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalSize, setTotalSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/crm/kb-search?q=${encodeURIComponent(q)}&pageSize=20`
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
      setTotalSize(data.totalSize ?? null);
      setElapsed(data.ms ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  return (
    <div className="min-h-screen bg-white px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">
        Knowledge Base Search
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Search across all enriched leads using natural language. Powered by Vertex AI Search over the NUMAT knowledge base.
      </p>

      <form onSubmit={onSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. architectural firms in Malaysia with sustainability focus"
          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 placeholder:text-slate-400"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Searching' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {totalSize !== null && !error && (
        <div className="mb-4 text-sm text-slate-500">
          {totalSize} total matches. Showing {results.length}. ({elapsed} ms)
        </div>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <div
            key={r.id}
            className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">
                  {r.title}
                </h3>
                {(r.full_name || r.email) && (
                  <p className="text-sm text-slate-600 truncate">
                    {r.full_name && <span>{r.full_name}</span>}
                    {r.full_name && r.email && <span className="mx-1">·</span>}
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {r.email}
                      </a>
                    )}
                  </p>
                )}
                {(r.city || r.country) && (
                  <p className="text-xs text-slate-500">
                    {[r.city, r.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {r.icp_fit_score !== null && (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${ICP_BADGE(
                      r.icp_fit_score
                    )}`}
                  >
                    ICP {r.icp_fit_score}
                  </span>
                )}
                {r.buying_signal_strength &&
                  ['hot', 'warm'].includes(r.buying_signal_strength) && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        SIGNAL_COLORS[r.buying_signal_strength] || ''
                      }`}
                    >
                      {r.buying_signal_strength}
                    </span>
                  )}
              </div>
            </div>

            {r.snippet && (
              <p
                className="text-sm text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: r.snippet }}
              />
            )}

            {r.rep_email && (
              <p className="text-xs text-slate-400 mt-2">
                Owned by {r.rep_email}
              </p>
            )}
          </div>
        ))}

        {!loading && results.length === 0 && totalSize === null && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">Enter a query above to search the knowledge base.</p>
            <p className="text-xs mt-2">
              Examples: &quot;design firms hiring in Manila&quot;, &quot;construction projects Cagayan de Oro&quot;, &quot;sustainable architecture Malaysia&quot;
            </p>
          </div>
        )}

        {!loading && results.length === 0 && totalSize === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No matches. Try broader terms.
          </div>
        )}
      </div>
    </div>
  );
}
