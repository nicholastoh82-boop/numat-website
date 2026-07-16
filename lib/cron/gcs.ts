// lib/cron/gcs.ts
//
// Minimal Cloud Storage upload helper. Uses the WIF access token flow from
// gcp_auth.ts. Uploads via the JSON API media upload endpoint, which is fine
// for small to medium objects (< a few hundred MB per file). For larger files
// switch to resumable upload, but we don't need it for text documents.

import { getGcpAccessToken } from './gcp_auth';

const UPLOAD_BASE = 'https://storage.googleapis.com/upload/storage/v1/b';

export async function uploadToGcs(args: {
  bucket: string;
  object: string;
  body: string | Buffer | Uint8Array;
  contentType?: string;
}): Promise<{ bucket: string; name: string; size: number }> {
  const token = await getGcpAccessToken();
  const url =
    `${UPLOAD_BASE}/${encodeURIComponent(args.bucket)}/o` +
    `?uploadType=media&name=${encodeURIComponent(args.object)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': args.contentType || 'application/octet-stream',
    },
    body: args.body as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`GCS upload failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { bucket: string; name: string; size: string };
  return { bucket: data.bucket, name: data.name, size: parseInt(data.size, 10) };
}
