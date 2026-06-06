// lib/cron/sheets.ts
//
// Helper for writing to Google Sheets via the Sheets API v4.
//
// Auth: WIF -> SA access token with spreadsheets scope.
//
// Permission requirement: the sheet must be shared with the service
// account email (gemini-cron-runner@numat-automation.iam.gserviceaccount.com)
// as Editor.
//
// Tab name: do NOT hardcode "Sheet1". Sheets created from a CSV upload via
// the Drive API often have the filename as the tab name. We discover the
// first sheet's actual title at runtime via the spreadsheets.get endpoint.

import { getGcpAccessToken } from './gcp_auth';

const BASE_URL = 'https://sheets.googleapis.com/v4';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/**
 * Fetch the first sheet's title so we can build a valid A1 range. Caching
 * is not worth it; spreadsheets.get is cheap and the value can change if a
 * user renames the tab.
 */
async function getFirstSheetTitle(spreadsheetId: string, token: string): Promise<string> {
  const url = `${BASE_URL}/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Sheets metadata fetch failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };
  const title = data.sheets?.[0]?.properties?.title;
  if (!title) throw new Error('Spreadsheet has no sheets');
  return title;
}

/**
 * Clear all values in the first sheet, then write a fresh 2D array of
 * values starting at A1. Safe pattern for catalogs that get fully rebuilt
 * on each sync.
 */
export async function replaceSheetValues(args: {
  spreadsheetId: string;
  sheetName?: string;
  values: (string | number | null)[][];
}): Promise<{ rowsWritten: number; sheetName: string }> {
  const token = await getGcpAccessToken([SHEETS_SCOPE]);
  const sheet = args.sheetName || (await getFirstSheetTitle(args.spreadsheetId, token));

  // Range references need single quotes around the sheet name in case it has
  // spaces or other special characters.
  const quotedSheet = `'${sheet.replace(/'/g, "''")}'`;
  const clearRange = encodeURIComponent(`${quotedSheet}!A:Z`);
  const writeRange = encodeURIComponent(`${quotedSheet}!A1`);

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
  return { rowsWritten: args.values.length, sheetName: sheet };
}
