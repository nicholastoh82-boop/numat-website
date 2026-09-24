// lib/leads/website-intake.ts
//
// One place for what happens to every order request or enquiry submitted
// through numatbamboo.com:
//
// 1. WEBSITE_ALERT_RECIPIENTS: who is emailed the moment it arrives.
// 2. logWebsiteSubmission(): appends one row to the "website" tab of the
//    NUMAT sales tracker Google Sheet so the team can follow up on status.
//
// Sheet requirements (see CLAUDE.md, "Website submissions"):
// - Must be a native Google Sheet. The Sheets API cannot write to an .xlsx
//   file stored in Drive.
// - Shared as Editor with the service account in GCP_SERVICE_ACCOUNT
//   (gemini-cron-runner@numat-automation.iam.gserviceaccount.com).
// - WEBSITE_SUBMISSIONS_SHEET_ID set in Vercel. Optional
//   WEBSITE_SUBMISSIONS_SHEET_TAB (defaults to "website").
//
// Logging never throws: a sheet outage must not lose or block a customer's
// submission, which is already saved in Supabase before this runs.

import { getGcpAccessToken } from '@/lib/cron/gcp_auth'

/** Everyone who must hear about a website order request or enquiry. */
export const WEBSITE_ALERT_RECIPIENTS = ['nick@numat.ph', 'bryan@numat.ph', 'erica@numat.ph']

const SHEETS_API = 'https://sheets.googleapis.com/v4'
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

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

/** Stop a visitor typing "=HYPERLINK(...)" and having the sheet run it. */
function cell(value: string | number | null | undefined): string | number {
  if (value == null) return ''
  if (typeof value === 'number') return value
  const text = value.replace(/\s+/g, ' ').trim().slice(0, 2000)
  return /^[=+\-@]/.test(text) ? `'${text}` : text
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

/**
 * Append one submission to the tracking sheet. Writes the header row first if
 * the tab is empty. Returns false (and logs) instead of throwing on failure.
 */
export async function logWebsiteSubmission(submission: WebsiteSubmission): Promise<boolean> {
  const spreadsheetId = process.env.WEBSITE_SUBMISSIONS_SHEET_ID
  const tab = process.env.WEBSITE_SUBMISSIONS_SHEET_TAB || 'website'
  if (!spreadsheetId) {
    console.warn('[Website sheet] WEBSITE_SUBMISSIONS_SHEET_ID not set, skipping sheet log')
    return false
  }

  try {
    const token = await getGcpAccessToken([SHEETS_SCOPE])
    const auth = { Authorization: `Bearer ${token}` }

    const headRes = await fetch(`${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${quotedRange(tab, 'A1:A1')}`, {
      headers: auth,
    })
    if (!headRes.ok) throw new Error(`read header ${headRes.status} ${await headRes.text()}`)
    const head = (await headRes.json()) as { values?: string[][] }
    const rows: (string | number)[][] = []
    if (!head.values?.[0]?.[0]) rows.push([...WEBSITE_SHEET_HEADERS])
    rows.push(buildSheetRow(submission))

    const appendRes = await fetch(
      `${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${quotedRange(tab, 'A:P')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows }),
      },
    )
    if (!appendRes.ok) throw new Error(`append ${appendRes.status} ${await appendRes.text()}`)
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
