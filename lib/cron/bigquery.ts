// lib/cron/bigquery.ts
//
// Helpers for loading data into BigQuery from Cloud Storage.
//
// Pattern: dump NDJSON to GCS, then start a BigQuery load job that reads the
// GCS URI into a table. WRITE_TRUNCATE means each sync replaces the table
// contents (we're doing full overwrites, not incremental). Schema is
// auto-detected from the first load and preserved on subsequent overwrites
// unless the JSON shape changes.

import { getGcpAccessToken } from './gcp_auth';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'numat-automation';
const BASE_URL = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}`;

export type LoadJobResult = {
  jobId: string;
  status: 'DONE' | 'PENDING' | 'RUNNING';
  rowsLoaded?: number;
  error?: string;
};

/**
 * Start a BigQuery load job that reads NDJSON from GCS into a table.
 * Uses WRITE_TRUNCATE (overwrites). Schema is auto-detected.
 *
 * Returns immediately after queueing the job. Optionally poll with
 * `waitForJob()` if you need to know when it completes.
 */
export async function loadNdjsonFromGcs(args: {
  dataset: string;
  table: string;
  gcsUri: string;
}): Promise<{ jobId: string }> {
  const token = await getGcpAccessToken();
  const url = `${BASE_URL}/jobs`;
  const body = {
    configuration: {
      load: {
        sourceUris: [args.gcsUri],
        destinationTable: {
          projectId: PROJECT_ID,
          datasetId: args.dataset,
          tableId: args.table,
        },
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        writeDisposition: 'WRITE_TRUNCATE',
        autodetect: true,
        ignoreUnknownValues: true,
      },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`BigQuery load job failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { jobReference: { jobId: string } };
  return { jobId: data.jobReference.jobId };
}

/**
 * Poll a BigQuery job until completion or timeout. Returns the final status.
 */
export async function waitForJob(
  jobId: string,
  timeoutMs = 120_000
): Promise<LoadJobResult> {
  const token = await getGcpAccessToken();
  const url = `${BASE_URL}/jobs/${jobId}`;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Job poll failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as any;
    const state: 'DONE' | 'PENDING' | 'RUNNING' = data.status?.state ?? 'PENDING';
    if (state === 'DONE') {
      const errMsg = data.status?.errorResult?.message as string | undefined;
      const stats = data.statistics?.load;
      return {
        jobId,
        status: 'DONE',
        rowsLoaded: stats ? parseInt(stats.outputRows || '0', 10) : 0,
        error: errMsg,
      };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { jobId, status: 'RUNNING', error: 'poll timeout' };
}
