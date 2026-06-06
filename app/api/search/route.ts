// app/api/search/route.ts
//
// Query the NUMAT knowledge base via Vertex AI Search, then enrich the
// results with human-readable company and contact info from Supabase.
//
// The KB stores one document per lead, named {uuid}.txt. By default
// Vertex returns the UUID as the title, which is useless for humans.
// We extract the UUID from each result's GCS link, batch-query Supabase
// master_leads, and inject company + full_name + email + country into
// the result payload.
//
// Auth: Bearer CRON_SECRET (same as cron routes; CRM UI will pass the
// secret via a server-side proxy so the user never sees it).
//
// Usage:
//   POST /api/search   { "query": "...", "summary": true, "pageSize": 10 }
//   GET  /api/search?q=...&summary=1&pageSize=10
//
// Returns:
//   { ok, results: [{ id, company, full_name, email, country, snippet,
//                     icp_fit_score, buying_signal_strength, link }], totalSize, ms }

import { authorized, supabaseGetRaw } from '@/lib/cron/helpers';
import { searchKb, type SearchResult } from '@/lib/cron/discovery_engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type SearchBody = {
  query?: string;
  pageSize?: number;
  summary?: boolean;
};

type LeadLookup = {
  id: string;
  company: string | null;
  full_name: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  icp_fit_score: number | null;
  buying_signal_strength: string | null;
  rep_email: string | null;
  enrichment_tier: string | null;
};

// UUIDs look like 8-4-4-4-12 hex chars. Use this to pull them out of the
// title (which is sometimes the UUID directly) or out of the GCS link
// gs://numat-knowledge-base/leads/{uuid}.txt.
const UUID_RE =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function extractUuid(r: SearchResult): string | null {
  const candidates = [r.title, r.link, r.uri, r.id];
  for (const c of candidates) {
    if (!c) continue;
    const m = UUID_RE.exec(c);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

async function lookupLeads(uuids: string[]): Promise<Map<string, LeadLookup>> {
  if (uuids.length === 0) return new Map();
  const inList = uuids.map((u) => `"${u}"`).join(',');
  const path =
    'master_leads' +
    '?select=id,company,full_name,email,country,city,icp_fit_score,' +
    'buying_signal_strength,rep_email,enrichment_tier' +
    `&id=in.(${encodeURIComponent(inList)})`;
  try {
    const rows = await supabaseGetRaw<LeadLookup[]>(path);
    const m = new Map<string, LeadLookup>();
    for (const r of rows) m.set(r.id.toLowerCase(), r);
    return m;
  } catch {
    return new Map();
  }
}

async function handle(req: Request, body: SearchBody): Promise<Response> {
  const started = Date.now();
  const query = (body.query || '').trim();
  if (!query) {
    return Response.json(
      { ok: false, error: 'query is required' },
      { status: 400 }
    );
  }

  try {
    const data = await searchKb(query, {
      pageSize: body.pageSize,
      generateSummary: body.summary,
    });

    const uuids = data.results
      .map(extractUuid)
      .filter((u): u is string => !!u);
    const uniqUuids = Array.from(new Set(uuids));
    const leadMap = await lookupLeads(uniqUuids);

    const enriched = data.results.map((r) => {
      const uuid = extractUuid(r);
      const lead = uuid ? leadMap.get(uuid) : null;
      return {
        id: r.id,
        uuid,
        // Human-friendly title: company name first, then fallback to the
        // raw title if Supabase has no record for this UUID.
        title: lead?.company || r.title || uuid || 'Unknown',
        company: lead?.company || null,
        full_name: lead?.full_name || null,
        email: lead?.email || null,
        country: lead?.country || null,
        city: lead?.city || null,
        icp_fit_score: lead?.icp_fit_score ?? null,
        buying_signal_strength: lead?.buying_signal_strength || null,
        rep_email: lead?.rep_email || null,
        enrichment_tier: lead?.enrichment_tier || null,
        snippet: r.snippet || '',
        link: r.link,
      };
    });

    return Response.json({
      ok: true,
      query,
      results: enriched,
      totalSize: data.totalSize,
      enriched_count: enriched.filter((e) => !!e.company).length,
      ms: Date.now() - started,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Search failed:', msg);
    return Response.json(
      { ok: false, error: msg, ms: Date.now() - started },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  const body = (await req.json().catch(() => ({}))) as SearchBody;
  return handle(req, body);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  const url = new URL(req.url);
  const body: SearchBody = {
    query: url.searchParams.get('q') || undefined,
    pageSize: url.searchParams.get('pageSize')
      ? parseInt(url.searchParams.get('pageSize')!, 10)
      : undefined,
    summary:
      url.searchParams.get('summary') === '1' ||
      url.searchParams.get('summary') === 'true',
  };
  return handle(req, body);
}
