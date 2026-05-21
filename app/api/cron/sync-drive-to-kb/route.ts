// app/api/cron/sync-drive-to-kb/route.ts
//
// Vercel Cron (manual trigger initially). Syncs Google Docs and Google
// Sheets from a configured Drive folder into the NUMAT knowledge base.
//
// Workflow:
//   1. Refresh nick@numat.ph's Drive access token (requires drive.readonly
//      scope; re-auth at /api/gmail/auth if missing).
//   2. List Docs/Sheets in DRIVE_SYNC_FOLDER_ID.
//   3. For each, export as text/plain (or CSV for Sheets), wrap with a
//      header naming the document, upload to GCS at drive/{file_id}.txt.
//   4. Trigger Discovery Engine import. Documents become searchable
//      alongside lead docs at /api/search and /crm/search.
//
// Required env vars:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (already set for Gmail OAuth)
//   DRIVE_SYNC_FOLDER_ID (the Drive folder to sync; set this in Vercel)
//
// Required Supabase data:
//   rep_gmail_tokens row for nick@numat.ph with scope including drive.readonly.
//
// If the schedule is added to vercel.json without these prerequisites, the
// cron will return a clear error and skip; no leads or other syncs are
// affected.

import { authorized } from '@/lib/cron/helpers';
import { getDriveAccessToken, listDocsInFolder, exportDocAsText } from '@/lib/cron/drive';
import { uploadToGcs } from '@/lib/cron/gcs';
import { importDocumentsFromGcs } from '@/lib/cron/discovery_engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUCKET = 'numat-knowledge-base';
const REP = 'nick@numat.ph';
const PARALLEL = 6;

async function handle(): Promise<Response> {
  const started = Date.now();
  const folderId = process.env.DRIVE_SYNC_FOLDER_ID;
  if (!folderId) {
    return Response.json(
      {
        ok: false,
        error:
          'DRIVE_SYNC_FOLDER_ID env var not set. Set it in Vercel to the ID of the Drive folder you want indexed.',
      },
      { status: 400 }
    );
  }

  let token: string;
  try {
    token = await getDriveAccessToken(REP);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 401 });
  }

  let files;
  try {
    files = await listDocsInFolder(token, folderId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }

  if (files.length === 0) {
    return Response.json({
      ok: true,
      message: 'No Docs or Sheets found in folder.',
      folder_id: folderId,
      ms: Date.now() - started,
    });
  }

  const results: Array<{
    id: string;
    name: string;
    status: 'ok' | 'error';
    error?: string;
  }> = [];
  const gcsUris: string[] = [];

  // Process in parallel pools to keep the run inside Vercel's 300 sec budget.
  for (let i = 0; i < files.length; i += PARALLEL) {
    const batch = files.slice(i, i + PARALLEL);
    const batchResults = await Promise.all(
      batch.map(async (f) => {
        try {
          const text = await exportDocAsText(token, f.id, f.mimeType);
          const header =
            `# ${f.name}\n` +
            `Source: Google Drive\n` +
            `File ID: ${f.id}\n` +
            `Modified: ${f.modifiedTime || 'unknown'}\n` +
            `Link: ${f.webViewLink || ''}\n\n`;
          const body = header + text;
          const object = `drive/${f.id}.txt`;
          await uploadToGcs({
            bucket: BUCKET,
            object,
            body,
            contentType: 'text/plain',
          });
          gcsUris.push(`gs://${BUCKET}/${object}`);
          return { id: f.id, name: f.name, status: 'ok' as const };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            id: f.id,
            name: f.name,
            status: 'error' as const,
            error: msg.slice(0, 200),
          };
        }
      })
    );
    results.push(...batchResults);
  }

  // Trigger Discovery Engine import only for successfully uploaded files.
  let importOperation: string | undefined;
  let importError: string | undefined;
  if (gcsUris.length > 0) {
    try {
      const op = await importDocumentsFromGcs(gcsUris);
      importOperation = op.operation;
    } catch (err) {
      importError = err instanceof Error ? err.message : String(err);
    }
  }

  return Response.json({
    ok: importError ? false : true,
    folder_id: folderId,
    picked: files.length,
    ok_count: results.filter((r) => r.status === 'ok').length,
    err_count: results.filter((r) => r.status === 'error').length,
    bucket: BUCKET,
    import_operation: importOperation,
    import_error: importError,
    sample_errors: results
      .filter((r) => r.status === 'error')
      .slice(0, 5)
      .map((r) => ({ id: r.id, name: r.name, error: r.error })),
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
