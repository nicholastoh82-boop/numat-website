// lib/leads/website-intake.ts
//
// One place for what happens to every order request or enquiry submitted
// through numatbamboo.com:
//
// 1. WEBSITE_ALERT_RECIPIENTS: who is emailed the moment it arrives.
// 2. logWebsiteSubmission(): appends one row to the "website" tab of the
//    NUMAT sales tracker Google Sheet so the team can follow up on status.
//
// The tracker (NUMAT_Near_Term_Revenue_Tracker.xlsx) is an .xlsx file in Google
// Drive that is already shared with the team, so it must stay that file:
// - .xlsx: download it, append to the "website" tab only (lib/leads/xlsx-append.ts
//   leaves every other part of the workbook byte for byte), upload it back as a
//   new revision of the same file. Link, ID and sharing do not change.
// - If it is ever converted to a native Google Sheet, the Sheets API append
//   path below is used automatically instead.
// Requirements: the file is shared as Editor with the service account in
// GCP_SERVICE_ACCOUNT (gemini-cron-runner@numat-automation.iam.gserviceaccount.com)
// and the Google Drive API is enabled for that GCP project.
// Overrides: WEBSITE_SUBMISSIONS_SHEET_ID, WEBSITE_SUBMISSIONS_SHEET_TAB.
//
// Logging never throws: a sheet outage must not lose or block a customer's
// submission, which is already saved in Supabase before this runs.

import { getGcpAccessToken } from '@/lib/cron/gcp_auth'
import { appendRowsToXlsx } from '@/lib/leads/xlsx-append'

/** Everyone who must hear about a website order request or enquiry. */
export const WEBSITE_ALERT_RECIPIENTS = ['nick@numat.ph', 'bryan@numat.ph', 'erica@numat.ph']

const SHEETS_API = 'https://sheets.googleapis.com/v4'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** NUMAT_Near_Term_Revenue_Tracker.xlsx, "website" tab. */
const DEFAULT_TRACKER_FILE_ID = '1TIwmgHhd5lbS0ucR4z8DbevGtptoE5T2'

export const WEBSITE_SHEET_HEADERS = [
  'Submitted (PH time)',
  'Reference',
  'Type',
  'Source',
  'Name',
  'Company',
  'Email',
  'Phone',
  'Products and quantities',
  'Order value (PHP)',
  'Preferred reply',
  'Application',
  'Customer message',
  'Assigned to',
  'Status',
  'Follow up notes',
] as const

export type WebsiteSubmissionType =
  | 'Order request'
  | 'Contact enquiry'
  | 'Quick enquiry'
  | 'Project qualification'
  | 'Chatbot lead'

export type WebsiteSubmission = {
  type: WebsiteSubmissionType
  reference?: string | null
  source?: string | null
  name?: string | null
  company?: string | null
  email?: string | null
  phone?: string | null
  items?: Array<{ name: string; specs?: string | null; quantity: number }>
  orderValuePhp?: number | null
  preferredReply?: string | null
  application?: string | null
  message?: string | null
}

/** Lead routing from CLAUDE.md: Philippine numbers to Bryan, others to Mohan. */
export function assignOwner(phone?: string | null): string {
  if (!phone) return 'Unassigned'
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+63') || digits.startsWith('63') || digits.startsWith('09')) return 'Bryan'
  return 'Mohan'
}

function manilaTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

/** Both write paths store text literally (inline strings / RAW), so a visitor
 *  typing "=HYPERLINK(...)" is shown as text and never run as a formula. */
function cell(value: string | number | null | undefined): string | number {
  if (value == null) return ''
  if (typeof value === 'number') return value
  return value.replace(/\s+/g, ' ').trim().slice(0, 2000)
}

export function buildSheetRow(s: WebsiteSubmission): (string | number)[] {
  const items = (s.items ?? [])
    .map((it) => `${it.quantity} x ${it.name}${it.specs ? ` (${it.specs})` : ''}`)
    .join('; ')
  return [
    manilaTimestamp(),
    cell(s.reference),
    s.type,
    cell(s.source ?? 'numatbamboo.com'),
    cell(s.name),
    cell(s.company),
    cell(s.email),
    cell(s.phone),
    cell(items),
    s.orderValuePhp != null && s.orderValuePhp > 0 ? Math.round(s.orderValuePhp) : '',
    cell(s.preferredReply),
    cell(s.application),
    cell(s.message),
    assignOwner(s.phone),
    'New',
    '',
  ]
}

function quotedRange(tab: string, a1: string) {
  return encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${a1}`)
}

async function appendToGoogleSheet(fileId: string, tab: string, row: (string | number)[], auth: Record<string, string>) {
  const headRes = await fetch(`${SHEETS_API}/spreadsheets/${fileId}/values/${quotedRange(tab, 'A1:A1')}`, { headers: auth })
  if (!headRes.ok) throw new Error(`read header ${headRes.status} ${await headRes.text()}`)
  const head = (await headRes.json()) as { values?: string[][] }
  const rows: (string | number)[][] = []
  if (!head.values?.[0]?.[0]) rows.push([...WEBSITE_SHEET_HEADERS])
  rows.push(row)
  const res = await fetch(
    `${SHEETS_API}/spreadsheets/${fileId}/values/${quotedRange(tab, 'A:P')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: rows }) },
  )
  if (!res.ok) throw new Error(`sheets append ${res.status} ${await res.text()}`)
}

async function driveMeta(fileId: string, auth: Record<string, string>) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?fields=mimeType,modifiedTime&supportsAllDrives=true`, { headers: auth })
  if (!res.ok) throw new Error(`drive metadata ${res.status} ${await res.text()}`)
  return (await res.json()) as { mimeType: string; modifiedTime: string }
}

/**
 * Download the .xlsx, append to one tab, upload as a new revision of the same
 * file. If someone saved the file in between, start again from their version
 * so their edit is kept (up to 3 attempts).
 */
async function appendToDriveXlsx(fileId: string, tab: string, row: (string | number)[], auth: Record<string, string>) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const before = await driveMeta(fileId, auth)
    const dl = await fetch(`${DRIVE_API}/files/${fileId}?alt=media&supportsAllDrives=true`, { headers: auth })
    if (!dl.ok) throw new Error(`drive download ${dl.status} ${await dl.text()}`)
    const updated = appendRowsToXlsx(new Uint8Array(await dl.arrayBuffer()), tab, [row], [...WEBSITE_SHEET_HEADERS])

    const check = await driveMeta(fileId, auth)
    if (check.modifiedTime !== before.modifiedTime) continue

    const up = await fetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media&supportsAllDrives=true`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': XLSX_MIME },
      body: Buffer.from(updated),
    })
    if (!up.ok) throw new Error(`drive upload ${up.status} ${await up.text()}`)
    return
  }
  throw new Error('tracker kept changing during upload, gave up after 3 attempts')
}

/**
 * Append one submission to the "website" tab of the sales tracker. Returns
 * false (and logs) instead of throwing, so a tracker problem never blocks or
 * loses a submission; the submission is already saved in Supabase.
 */
export async function logWebsiteSubmission(submission: WebsiteSubmission): Promise<boolean> {
  const fileId = process.env.WEBSITE_SUBMISSIONS_SHEET_ID || DEFAULT_TRACKER_FILE_ID
  const tab = process.env.WEBSITE_SUBMISSIONS_SHEET_TAB || 'website'
  const row = buildSheetRow(submission)

  try {
    const token = await getGcpAccessToken(SCOPES)
    const auth = { Authorization: `Bearer ${token}` }
    const meta = await driveMeta(fileId, auth)
    if (meta.mimeType === GOOGLE_SHEET_MIME) {
      await appendToGoogleSheet(fileId, tab, row, auth)
    } else {
      await appendToDriveXlsx(fileId, tab, row, auth)
    }
    return true
  } catch (err) {
    console.error('[Website sheet] Failed to log submission', submission.reference ?? submission.type, err)
    return false
  }
}

export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
