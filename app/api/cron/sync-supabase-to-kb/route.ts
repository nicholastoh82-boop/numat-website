// app/api/cron/sync-supabase-to-kb/route.ts
//
// Vercel Cron: runs daily.
// Exports enriched leads from Supabase as Markdown text documents, uploads
// them to Cloud Storage, then triggers a Vertex AI Search incremental import
// so they show up in the NUMAT knowledge base search index.
//
// Each lead becomes one document at gs://numat-knowledge-base/leads/{id}.md
//
// Throughput controlled by SUPABASE_KB_SYNC_MAX env var (default 500, cap 2000).
// Concurrency for uploads via SUPABASE_KB_SYNC_CONCURRENCY (default 20, cap 50).

import { authorized, supabaseGetRaw } from '@/lib/cron/helpers';
import { uploadToGcs } from '@/lib/cron/gcs';
import { importDocumentsFromGcs } from '@/lib/cron/discovery_engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUCKET = 'numat-knowledge-base';

type LeadRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  company_domain: string | null;
  country: string | null;
  city: string | null;
  rep_email: string | null;
  business_description: string | null;
  icp_fit_score: number | null;
  icp_fit_reason: string | null;
  employee_size_band: string | null;
  pain_hooks: string[] | null;
  product_recommendations: string[] | null;
  products_offered: string[] | null;
  buying_signal_strength: string | null;
  buying_signal_summary: string | null;
  buying_signal_evidence: Array<{
    type?: string;
    source_url?: string;
    description?: string;
    detected_date?: string;
  }> | null;
  buying_signal_detected_at: string | null;
  distance_from_factory_km: number | null;
  freight_estimate_php: number | null;
  geocoded_address: string | null;
  last_enriched_at: string | null;
  enrichment_tier: string | null;
};

function batchSize(): number {
  const raw = process.env.SUPABASE_KB_SYNC_MAX;
  const n = raw ? parseInt(raw, 10) : 500;
  if (!Number.isFinite(n) || n <= 0) return 500;
  return Math.min(n, 2000);
}

function concurrency(): number {
  const raw = process.env.SUPABASE_KB_SYNC_CONCURRENCY;
  const n = raw ? parseInt(raw, 10) : 20;
  if (!Number.isFinite(n) || n <= 0) return 20;
  return Math.min(n, 50);
}

async function pickLeads(limit: number): Promise<LeadRow[]> {
  const select = [
    'id', 'email', 'full_name', 'company', 'company_domain', 'country', 'city',
    'rep_email', 'business_description', 'icp_fit_score', 'icp_fit_reason',
    'employee_size_band', 'pain_hooks', 'product_recommendations', 'products_offered',
    'buying_signal_strength', 'buying_signal_summary', 'buying_signal_evidence',
    'buying_signal_detected_at', 'distance_from_factory_km', 'freight_estimate_php',
    'geocoded_address', 'last_enriched_at', 'enrichment_tier',
  ].join(',');
  const path =
    `master_leads?select=${select}` +
    `&enrichment_tier=eq.enriched` +
    `&order=last_enriched_at.desc.nullslast` +
    `&limit=${limit}`;
  return supabaseGetRaw<LeadRow[]>(path);
}

function bullets(items: string[] | null | undefined): string {
  if (!items || items.length === 0) return '(none)';
  return items.map((s) => `- ${s}`).join('\n');
}

function renderLeadMarkdown(lead: LeadRow): string {
  const lines: string[] = [];
  lines.push(`# Lead: ${lead.company || lead.full_name || lead.email || lead.id}`);
  lines.push('');
  lines.push(`**Contact:** ${lead.full_name || '(unknown)'} <${lead.email || 'n/a'}>`);
  lines.push(`**Domain:** ${lead.company_domain || '(none)'}`);
  if (lead.geocoded_address) lines.push(`**Location:** ${lead.geocoded_address}`);
  else if (lead.city || lead.country) {
    lines.push(`**Location:** ${[lead.city, lead.country].filter(Boolean).join(', ')}`);
  }
  if (lead.distance_from_factory_km !== null) {
    lines.push(`**Distance from factory:** ${lead.distance_from_factory_km} km`);
  }
  if (lead.freight_estimate_php !== null) {
    lines.push(`**Freight estimate:** PHP ${lead.freight_estimate_php} per board`);
  }
  if (lead.icp_fit_score !== null) {
    lines.push(`**ICP Fit Score:** ${lead.icp_fit_score} / 100`);
  }
  if (lead.employee_size_band) {
    lines.push(`**Company size:** ${lead.employee_size_band}`);
  }
  if (lead.buying_signal_strength) {
    lines.push(`**Buying signal:** ${lead.buying_signal_strength}`);
  }
  if (lead.rep_email) {
    lines.push(`**Assigned rep:** ${lead.rep_email}`);
  }
  lines.push('');

  if (lead.business_description) {
    lines.push('## Business');
    lines.push(lead.business_description);
    lines.push('');
  }

  if (lead.icp_fit_reason) {
    lines.push('## ICP Fit Reasoning');
    lines.push(lead.icp_fit_reason);
    lines.push('');
  }

  if (lead.products_offered && lead.products_offered.length > 0) {
    lines.push('## Products and services they offer');
    lines.push(bullets(lead.products_offered));
    lines.push('');
  }

  if (lead.pain_hooks && lead.pain_hooks.length > 0) {
    lines.push('## Pain hooks for outreach');
    lines.push(bullets(lead.pain_hooks));
    lines.push('');
  }

  if (lead.product_recommendations && lead.product_recommendations.length > 0) {
    lines.push('## Recommended NUMAT products');
    lines.push(bullets(lead.product_recommendations));
    lines.push('');
  }

  if (lead.buying_signal_summary) {
    lines.push('## Buying signal summary');
    lines.push(lead.buying_signal_summary);
    lines.push('');
  }

  if (lead.buying_signal_evidence && lead.buying_signal_evidence.length > 0) {
    lines.push('## Buying signal evidence');
    for (const e of lead.buying_signal_evidence) {
      const t = e.type ? `[${e.type}] ` : '';
      const d = e.detected_date ? ` (${e.detected_date})` : '';
      const u = e.source_url ? ` ${e.source_url}` : '';
      lines.push(`- ${t}${e.description || ''}${d}${u}`);
    }
    lines.push('');
  }

  lines.push('## Metadata');
  if (lead.last_enriched_at) lines.push(`- Last enriched: ${lead.last_enriched_at}`);
  if (lead.buying_signal_detected_at) {
    lines.push(`- Last signal scan: ${lead.buying_signal_detected_at}`);
  }
  lines.push(`- Lead ID: ${lead.id}`);

  return lines.join('\n');
}

async function syncOneLead(lead: LeadRow): Promise<{
  id: string;
  status: 'ok' | 'error';
  bytes?: number;
  error?: string;
}> {
  try {
    const md = renderLeadMarkdown(lead);
    const result = await uploadToGcs({
      bucket: BUCKET,
      object: `leads/${lead.id}.md`,
      body: md,
      contentType: 'text/markdown; charset=utf-8',
    });
    return { id: lead.id, status: 'ok', bytes: result.size };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { id: lead.id, status: 'error', error: msg.slice(0, 200) };
  }
}

async function handle(): Promise<Response> {
  const started = Date.now();
  const limit = batchSize();

  let leads: LeadRow[];
  try {
    leads = await pickLeads(limit);
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: `pickLeads failed: ${err instanceof Error ? err.message : String(err)}`,
        ms: Date.now() - started,
      },
      { status: 500 }
    );
  }

  if (leads.length === 0) {
    return Response.json({
      ok: true,
      message: 'No enriched leads to sync yet',
      picked: 0,
      ms: Date.now() - started,
    });
  }

  // Upload in parallel pool
  const queue = [...leads];
  const results: Awaited<ReturnType<typeof syncOneLead>>[] = [];
  const workerCount = Math.min(concurrency(), leads.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const lead = queue.shift();
        if (!lead) break;
        const out = await syncOneLead(lead);
        results.push(out);
      }
    })
  );

  const ok_count = results.filter((r) => r.status === 'ok').length;
  const err_count = results.filter((r) => r.status === 'error').length;

  // Trigger Discovery Engine import on the leads prefix
  let importOp: string | null = null;
  let importErr: string | null = null;
  if (ok_count > 0) {
    try {
      const imp = await importDocumentsFromGcs([`gs://${BUCKET}/leads/*.md`]);
      importOp = imp.operation;
    } catch (err) {
      importErr = err instanceof Error ? err.message : String(err);
    }
  }

  return Response.json({
    ok: true,
    picked: leads.length,
    ok_count,
    err_count,
    bucket: BUCKET,
    import_operation: importOp,
    import_error: importErr,
    ms: Date.now() - started,
    sample_errors: results.filter((r) => r.status === 'error').slice(0, 5),
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}
