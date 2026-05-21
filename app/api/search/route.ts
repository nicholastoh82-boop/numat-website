// app/api/search/route.ts
//
// Query the NUMAT knowledge base via Vertex AI Search.
//
// Auth: same Bearer CRON_SECRET as the cron routes (for now; will switch to
// Supabase Auth session check once we wire this into the CRM UI).
//
// Usage:
//   POST /api/search   { "query": "...", "summary": true, "pageSize": 10 }
//   GET  /api/search?q=...&summary=1&pageSize=10
//
// Returns:
//   { ok: true, results: [...], summary: "...", totalSize: N, ms: N }

import { authorized } from '@/lib/cron/helpers';
import { searchKb } from '@/lib/cron/discovery_engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type SearchBody = {
  query?: string;
  pageSize?: number;
  summary?: boolean;
};

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
    return Response.json({
      ok: true,
      query,
      results: data.results,
      summary: data.summary,
      totalSize: data.totalSize,
      ms: Date.now() - started,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Search failed:', msg);
    return Response.json(
      {
        ok: false,
        error: msg,
        ms: Date.now() - started,
      },
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
    summary: url.searchParams.get('summary') === '1' ||
             url.searchParams.get('summary') === 'true',
  };
  return handle(req, body);
}
