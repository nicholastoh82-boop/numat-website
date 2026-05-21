// lib/cron/drive.ts
//
// Google Drive API helper for reading a user's Drive content.
//
// Uses the per-user OAuth refresh token stored in rep_gmail_tokens. The
// token must have been issued with the https://www.googleapis.com/auth/drive.readonly
// scope. Old tokens issued before this scope was added need a re-auth
// at /api/gmail/auth?rep_email=... before Drive sync will work.

import { createClient } from '@supabase/supabase-js';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const OAUTH_REFRESH = 'https://oauth2.googleapis.com/token';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
};

type StoredToken = {
  refresh_token: string;
  scope: string;
  rep_email: string;
};

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get a fresh Drive access token for the given rep. Throws with a clear
 * message if the stored token lacks the drive.readonly scope.
 */
export async function getDriveAccessToken(repEmail: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('rep_gmail_tokens')
    .select('refresh_token, scope, rep_email')
    .eq('rep_email', repEmail)
    .eq('is_active', true)
    .maybeSingle<StoredToken>();
  if (error || !data) {
    throw new Error(
      `No active token for ${repEmail}. Connect Gmail first at /api/gmail/auth?rep_email=${repEmail}.`
    );
  }
  if (!data.scope?.includes(DRIVE_SCOPE)) {
    throw new Error(
      `Token for ${repEmail} is missing Drive scope. Re-authorise at /api/gmail/auth?rep_email=${repEmail} to grant Drive read access.`
    );
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: data.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch(OAUTH_REFRESH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) {
    throw new Error(
      `Drive token refresh failed: ${res.status} ${await res.text()}`
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Drive token refresh missing access_token');
  return json.access_token;
}

/**
 * List Google Docs and Google Sheets within a Drive folder OR within a
 * shared drive root. Recursive listing is not done; only direct children.
 * Trash items skipped.
 *
 * Works for both personal Drive folders and shared drives (Team Drives).
 * For shared drives, the folderId is the shared drive ID itself.
 */
export async function listDocsInFolder(
  accessToken: string,
  folderId: string,
  pageSize = 100
): Promise<DriveFile[]> {
  // Restrict to Google native doc types so the export endpoint works
  // cleanly. PDFs and Office files would need a different download path.
  const q = encodeURIComponent(
    `'${folderId}' in parents and trashed = false and ` +
      `(mimeType = 'application/vnd.google-apps.document' or ` +
      `mimeType = 'application/vnd.google-apps.spreadsheet')`
  );
  const fields = encodeURIComponent(
    'files(id,name,mimeType,modifiedTime,webViewLink,size),nextPageToken'
  );
  // supportsAllDrives + includeItemsFromAllDrives + corpora=allDrives
  // make this call work for personal folders AND shared drives in one
  // shot. No separate driveId handling needed.
  const url =
    `${DRIVE_API}/files?q=${q}&fields=${fields}&pageSize=${pageSize}` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Drive list failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { files?: DriveFile[] };
  return data.files || [];
}

/**
 * Export a Google native file as plain text. Sheets export as TSV-ish text.
 * Truncates at 100k chars to keep KB documents reasonably sized.
 */
export async function exportDocAsText(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  // Google Docs to text/plain, Sheets to text/csv
  const exportMime = mimeType === 'application/vnd.google-apps.spreadsheet'
    ? 'text/csv'
    : 'text/plain';
  const url =
    `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}` +
    `&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(
      `Drive export failed for ${fileId}: ${res.status} ${await res.text()}`
    );
  }
  const txt = await res.text();
  return txt.slice(0, 100_000);
}
