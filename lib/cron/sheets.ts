// lib/cron/sheets.ts
//
// Helper for writing to Google Sheets via the Sheets API v4.
//
// Auth: same WIF -> SA access token used everywhere else. The Sheets API
// is covered by the cloud-platform scope on the access token, so no extra
// scope handling is needed.
//
// Permission requirement: the sheet must be shared with the service
// account email (gemini-cron-runner@numat-automation.iam.gserviceaccount.com)
// as Editor. Done manually once when the sheet is created.

import { getGcpAccessToken } from './gcp_auth';

const BASE_URL = 'https://sheets.googleapis.com/v4';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/**
 * Clear all values in the given range, then write a fresh 2D array of
 * values starting at A1. This is the safe pattern for catalogs that get
 * fully rebuilt on each sync (instead of incrementally updated).
 *
 * `range` example: 'Sheet1!A:Z'
 */
export async function replaceSheetValues(args: {
  spreadsheetId: string;
  sheetName?: string;
  values: (string | number | null)[][];
}): Promise<{ rowsWritten: number }> {
  const token = await getGcpAccessToken([SHEETS_SCOPE]);
  const sheet = args.sheetName || 'Sheet1';
  const clearRange = encodeURIComponent(`${sheet}!A:Z`);
  const writeRange = encodeURIComponent(`${sheet}!A1`);

  // Step 1: clear the whole sheet so stale rows from previous syncs vanish.
  const clearRes = await fetch(
    `${BASE_URL}/spreadsheets/${args.spreadsheetId}/values/${clearRange}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!clearRes.ok) {
    throw new Error(
      `Sheets clear failed: ${clearRes.status} ${await clearRes.text()}`
    );
  }

  // Step 2: write fresh values starting at A1.
  const writeRes = await fetch(
    `${BASE_URL}/spreadsheets/${args.spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: args.values }),
    }
  );
  if (!writeRes.ok) {
    throw new Error(
      `Sheets write failed: ${writeRes.status} ${await writeRes.text()}`
    );
  }
  return { rowsWritten: args.values.length };
}
