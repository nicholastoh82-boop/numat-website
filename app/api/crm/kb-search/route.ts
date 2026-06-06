// app/api/crm/kb-search/route.ts
//
// CRM-facing knowledge base search. Unlike /api/search (which requires
// the CRON_SECRET), this route is accessible to any authenticated CRM
// session and never exposes the secret to the browser.
//
// Calls searchKb directly, then enriches with Supabase company info.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchKb, type SearchResult } from '@/lib/cron/discovery_engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

export async function GET(req: NextRequest) {
  const started = Date.now();
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const pageSize = url.searchParams.get('pageSize')
    ? Math.min(parseInt(url.searchParams.get('pageSize')!, 10) || 10, 50)
    : 10;
  if (!q) {
    return NextResponse.json({ ok: false, error: 'q required' }, { status: 400 });
  }

  try {
    const data = await searchKb(q, { pageSize });

    const uuids = Array.from(
      new Set(data.results.map(extractUuid).filter((u): u is string => !!u))
    );

    let leadMap = new Map<string, any>();
    if (uuids.length > 0) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: leads } = await sb
        .from('master_leads')
        .select(
          'id,company,full_name,email,country,city,icp_fit_score,buying_signal_strength,buying_signal_summary,rep_email,enrichment_tier'
        )
        .in('id', uuids);
      for (const l of leads || []) leadMap.set(l.id.toLowerCase(), l);
    }

    const enriched = data.results.map((r) => {
      const uuid = extractUuid(r);
      const lead = uuid ? leadMap.get(uuid) : null;
      return {
        id: r.id,
        uuid,
        title: lead?.company || r.title || uuid || 'Unknown',
        company: lead?.company || null,
        full_name: lead?.full_name || null,
        email: lead?.email || null,
        country: lead?.country || null,
        city: lead?.city || null,
        icp_fit_score: lead?.icp_fit_score ?? null,
        buying_signal_strength: lead?.buying_signal_strength || null,
        buying_signal_summary: lead?.buying_signal_summary || null,
        rep_email: lead?.rep_email || null,
        enrichment_tier: lead?.enrichment_tier || null,
        snippet: r.snippet || '',
        link: r.link,
      };
    });

    return NextResponse.json({
      ok: true,
      query: q,
      results: enriched,
      totalSize: data.totalSize,
      ms: Date.now() - started,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: msg, ms: Date.now() - started },
      { status: 500 }
    );
  }
}
