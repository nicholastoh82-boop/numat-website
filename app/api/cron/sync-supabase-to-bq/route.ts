// app/api/cron/sync-supabase-to-bq/route.ts
//
// Vercel Cron: runs daily.
// Exports key Supabase tables to BigQuery for analytics in Looker Studio.
//
// Workflow per table:
//   1. Paginate through Supabase REST API (PostgREST), pulling all rows
//   2. Convert to NDJSON
//   3. Upload to gs://numat-knowledge-base/bq-staging/{table}/{date}.ndjson
//   4. Start a BigQuery load job with WRITE_TRUNCATE (full overwrite)
//
// Tables synced:
//   - master_leads (CRM + enrichment + buying signals + geocoding)
//   - fin_transactions (bank credits, revenue, expenses)
//   - sequence_events (cold outreach email logs)
//   - company_research (Gemini enrichment payloads)
//   - personal_tasks (Telegram task feed)
//   - product_variants (SKU catalog)

import { authorized, supabaseGetRaw } from '@/lib/cron/helpers';
import { uploadToGcs } from '@/lib/cron/gcs';
import { loadNdjsonFromGcs } from '@/lib/cron/bigquery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUCKET = 'numat-knowledge-base';
const DATASET = 'numat_analytics';
const PAGE_SIZE = 1000;

// Tables to sync. Each entry: { table: supabase table name, bq_table: BQ table
// name (usually same), select: optional column list to keep payload small }.
const TABLES_TO_SYNC: Array<{
  table: string;
  bq_table?: string;
  select?: string;
}> = [
  { table: 'master_leads' },
  { table: 'fin_transactions' },
  { table: 'sequence_events' },
  { table: 'company_research' },
  { table: 'personal_tasks' },
  { table: 'product_variants' },
];

type SupabaseRow = Record<string, unknown>;

async function fetchAllRows(table: string, select?: string): Promise<SupabaseRow[]> {
  const all: SupabaseRow[] = [];
  let offset = 0;
  while (true) {
    const selectClause = select ? `select=${select}&` : '';
    const path = `${table}?${selectClause}order=created_at.asc.nullslast&limit=${PAGE_SIZE}&offset=${offset}`;
    let rows: SupabaseRow[] = [];
    try {
      rows = await supabaseGetRaw<SupabaseRow[]>(path);
    } catch (err) {
      // Some tables may not have a created_at column. Retry without ordering.
      if (offset === 0) {
        const fallbackPath = `${table}?${selectClause}limit=${PAGE_SIZE}&offset=${offset}`;
        rows = await supabaseGetRaw<SupabaseRow[]>(fallbackPath);
      } else {
        throw err;
      }
    }
    if (!rows || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset > 50_000) break; // safety cap
  }
  return all;
}

function rowsToNdjson(rows: SupabaseRow[]): string {
  // BigQuery autodetect dislikes mixed-type fields. Convert all values that
  // are nested objects or arrays into JSON strings so the schema stays simple.
  // Top-level scalars (string, number, bool, null) and dates stay as-is.
  return rows
    .map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v === null || v === undefined) {
          out[k] = null;
        } else if (typeof v === 'object') {
          // Stringify nested objects/arrays so BQ treats them as STRING columns.
          // Downstream analysts can use JSON_EXTRACT in BQ to dig into them.
          out[k] = JSON.stringify(v);
        } else {
          out[k] = v;
        }
      }
      return JSON.stringify(out);
    })
    .join('\n');
}

async function syncOneTable(args: {
  table: string;
  bq_table?: string;
  select?: string;
}): Promise<{
  table: string;
  status: 'ok' | 'error';
  rows?: number;
  bytes?: number;
  job_id?: string;
  error?: string;
}> {
  try {
    const rows = await fetchAllRows(args.table, args.select);
    if (rows.length === 0) {
      return { table: args.table, status: 'ok', rows: 0 };
    }
    const ndjson = rowsToNdjson(rows);
    const today = new Date().toISOString().slice(0, 10);
    const gcsObject = `bq-staging/${args.table}/${today}.ndjson`;
    const upload = await uploadToGcs({
      bucket: BUCKET,
      object: gcsObject,
      body: ndjson,
      contentType: 'application/x-ndjson',
    });
    const gcsUri = `gs://${BUCKET}/${gcsObject}`;
    const job = await loadNdjsonFromGcs({
      dataset: DATASET,
      table: args.bq_table || args.table,
      gcsUri,
    });
    return {
      table: args.table,
      status: 'ok',
      rows: rows.length,
      bytes: upload.size,
      job_id: job.jobId,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      table: args.table,
      status: 'error',
      error: msg.slice(0, 300),
    };
  }
}

async function handle(): Promise<Response> {
  const started = Date.now();

  // Run table syncs serially to avoid blowing past Supabase rate limits or
  // hitting the Vercel function memory ceiling on big tables.
  const results: Awaited<ReturnType<typeof syncOneTable>>[] = [];
  for (const cfg of TABLES_TO_SYNC) {
    const r = await syncOneTable(cfg);
    results.push(r);
  }

  const ok_count = results.filter((r) => r.status === 'ok').length;
  const err_count = results.filter((r) => r.status === 'error').length;
  const total_rows = results.reduce((s, r) => s + (r.rows || 0), 0);

  return Response.json({
    ok: true,
    dataset: `${process.env.GCP_PROJECT_ID || 'numat-automation'}.${DATASET}`,
    tables: TABLES_TO_SYNC.length,
    ok_count,
    err_count,
    total_rows,
    results,
    ms: Date.now() - started,
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
