// app/api/cron/sync-data-catalog/route.ts
//
// Vercel Cron: runs daily at 04:00 UTC (12 noon MYT).
//
// Builds a live catalog of every data asset across the NUMAT stack and
// writes it to the "NUMAT Data Catalog" Google Sheet so Nick has one
// place to find any dashboard, database, file, or report.
//
// Inputs combined:
//   1. data_assets table in Supabase (manual entries for things that
//      can't be auto-discovered, e.g. Looker Studio reports).
//   2. BigQuery tables and views in numat_analytics dataset.
//   3. Cloud Run services in asia-southeast1.
//   4. Cron endpoints from vercel.json (parsed from the deployed bundle).
//   5. Top-level prefixes in the numat-knowledge-base GCS bucket.
//
// Output: a single rectangular Google Sheet with columns
//   Category, Name, Description, URL, Owner, Source, Last Synced.

import { authorized, supabaseGetRaw } from '@/lib/cron/helpers';
import { getGcpAccessToken } from '@/lib/cron/gcp_auth';
import { replaceSheetValues } from '@/lib/cron/sheets';
import vercelConfig from '@/vercel.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SHEET_ID = '1umx9iO-wu2ARzwqi1v-jslPacFURQNPxh1NQrEkt4jA';
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'numat-automation';
const BQ_DATASET = 'numat_analytics';
const CLOUD_RUN_REGION = 'asia-southeast1';
const GCS_BUCKET = 'numat-knowledge-base';
const BASE_URL = 'https://numatbamboo.com';

type CatalogRow = {
  category: string;
  name: string;
  description: string;
  url: string;
  owner: string;
  source: string;
};

// ---- Discovery: Supabase data_assets table ----

type SupabaseAsset = {
  category: string;
  name: string;
  description: string | null;
  url: string;
  owner: string | null;
  source: string | null;
};

async function discoverFromSupabase(): Promise<CatalogRow[]> {
  try {
    const rows = await supabaseGetRaw<SupabaseAsset[]>(
      'data_assets?select=category,name,description,url,owner,source&order=category.asc'
    );
    return rows.map((r) => ({
      category: r.category,
      name: r.name,
      description: r.description || '',
      url: r.url,
      owner: r.owner || '',
      source: r.source || 'manual',
    }));
  } catch (err) {
    return [];
  }
}

// ---- Discovery: BigQuery tables and views ----

async function discoverBigQuery(): Promise<CatalogRow[]> {
  try {
    const token = await getGcpAccessToken();
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${BQ_DATASET}/tables?maxResults=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      tables?: Array<{
        tableReference: { tableId: string };
        type: string;
      }>;
    };
    const tables = data.tables || [];
    return tables.map((t) => {
      const isView = t.type === 'VIEW';
      const consoleUrl = `https://console.cloud.google.com/bigquery?project=${PROJECT_ID}&ws=!1m5!1m4!4m3!1s${PROJECT_ID}!2s${BQ_DATASET}!3s${t.tableReference.tableId}`;
      return {
        category: isView ? 'warehouse_view' : 'warehouse_table',
        name: `${BQ_DATASET}.${t.tableReference.tableId}`,
        description: isView
          ? 'BigQuery view (aggregated for analytics)'
          : 'BigQuery table (synced daily from Supabase)',
        url: consoleUrl,
        owner: 'gemini-cron-runner',
        source: 'auto:bigquery',
      };
    });
  } catch (err) {
    return [];
  }
}

// ---- Discovery: Cloud Run services ----

async function discoverCloudRun(): Promise<CatalogRow[]> {
  try {
    const token = await getGcpAccessToken();
    const url = `https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${CLOUD_RUN_REGION}/services`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      services?: Array<{ name: string; uri?: string; description?: string }>;
    };
    const services = data.services || [];
    return services.map((s) => {
      const shortName = s.name.split('/').pop() || s.name;
      return {
        category: 'api',
        name: `Cloud Run: ${shortName}`,
        description: s.description || `Cloud Run service in ${CLOUD_RUN_REGION}`,
        url:
          s.uri ||
          `https://console.cloud.google.com/run/detail/${CLOUD_RUN_REGION}/${shortName}?project=${PROJECT_ID}`,
        owner: 'nick',
        source: 'auto:cloudrun',
      };
    });
  } catch (err) {
    return [];
  }
}

// ---- Discovery: Vercel crons from vercel.json ----

function discoverVercelCrons(): CatalogRow[] {
  const crons = (vercelConfig as { crons?: Array<{ path: string; schedule: string }> })
    .crons || [];
  return crons.map((c) => ({
    category: 'cron',
    name: c.path,
    description: `Cron schedule: ${c.schedule}`,
    url: `${BASE_URL}${c.path}`,
    owner: 'vercel',
    source: 'auto:vercel.json',
  }));
}

// ---- Discovery: top-level GCS prefixes ----

async function discoverGcsPrefixes(): Promise<CatalogRow[]> {
  try {
    const token = await getGcpAccessToken();
    const url = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o?delimiter=/&prefix=`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = (await res.json()) as { prefixes?: string[] };
    const prefixes = data.prefixes || [];
    return prefixes.map((p) => ({
      category: 'storage',
      name: `gs://${GCS_BUCKET}/${p}`,
      description: 'Cloud Storage folder',
      url: `https://console.cloud.google.com/storage/browser/${GCS_BUCKET}/${p}?project=${PROJECT_ID}`,
      owner: 'gemini-cron-runner',
      source: 'auto:gcs',
    }));
  } catch (err) {
    return [];
  }
}

// ---- Main handler ----

async function handle(): Promise<Response> {
  const started = Date.now();

  const [supabaseRows, bqRows, cloudRunRows, gcsRows] = await Promise.all([
    discoverFromSupabase(),
    discoverBigQuery(),
    discoverCloudRun(),
    discoverGcsPrefixes(),
  ]);
  const vercelRows = discoverVercelCrons();

  // Combine then dedupe by URL. Manual Supabase entries win on conflict so
  // that Nick's curated descriptions aren't overwritten by generic auto ones.
  const all: CatalogRow[] = [
    ...supabaseRows,
    ...bqRows,
    ...cloudRunRows,
    ...vercelRows,
    ...gcsRows,
  ];
  const seen = new Set<string>();
  const deduped: CatalogRow[] = [];
  for (const row of all) {
    const key = row.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  // Sort by category, then name, for a stable readable layout.
  deduped.sort((a, b) => {
    const cmp = a.category.localeCompare(b.category);
    return cmp !== 0 ? cmp : a.name.localeCompare(b.name);
  });

  const now = new Date().toISOString();
  const header = [
    'Category',
    'Name',
    'Description',
    'URL',
    'Owner',
    'Source',
    'Last Synced',
  ];
  const rows: (string | number | null)[][] = [
    header,
    ...deduped.map((r) => [
      r.category,
      r.name,
      r.description,
      r.url,
      r.owner,
      r.source,
      now,
    ]),
  ];

  try {
    const result = await replaceSheetValues({
      spreadsheetId: SHEET_ID,
      values: rows,
    });
    return Response.json({
      ok: true,
      sheet_url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`,
      total_rows: deduped.length,
      sources: {
        supabase: supabaseRows.length,
        bigquery: bqRows.length,
        cloud_run: cloudRunRows.length,
        vercel_crons: vercelRows.length,
        gcs_prefixes: gcsRows.length,
      },
      rows_written: result.rowsWritten,
      ms: Date.now() - started,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg.slice(0, 500) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}
