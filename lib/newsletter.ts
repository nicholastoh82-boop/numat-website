// Newsletter sending via Resend Broadcasts (REST API; the installed SDK version
// has no broadcasts support). Composed in the portal by the marketing role, sent
// from contact@numat.ph to the "NUMAT Newsletter" audience. Resend handles the
// queue, throttling, delivery, unsubscribe flow, and suppression.

const RESEND_API = 'https://api.resend.com'
const KEY = process.env.RESEND_API_KEY

export const NEWSLETTER_FROM =
  process.env.RESEND_NEWSLETTER_FROM || 'NUMAT <contact@numat.ph>'
export const NEWSLETTER_REPLY_TO =
  process.env.RESEND_NEWSLETTER_REPLY_TO || 'contact@numat.ph'
export const NEWSLETTER_AUDIENCE_ID =
  process.env.RESEND_NEWSLETTER_AUDIENCE_ID || '59ec738c-117d-4fe6-9ccf-1e47664fb418'

// Placeholder Resend swaps for a real per-recipient unsubscribe link in broadcasts.
const UNSUB = '{{{RESEND_UNSUBSCRIBE_URL}}}'

// Keep the composed body to a safe subset. This is an internal tool used by a
// trusted marketer, so this is light hygiene rather than a full sanitizer: drop
// scripts, iframes, and inline event handlers before the HTML is sent.
function cleanBody(html: string): string {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/ on[a-z]+="[^"]*"/gi, '')
    .replace(/ on[a-z]+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

// Wrap the composed body in a branded, email-client-safe (table based) shell.
export function wrapNewsletterHtml(bodyHtml: string, previewText = ''): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}</div>` : ''}
</head>
<body style="margin:0;padding:0;background:#f4f6f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#16361f;padding:22px 28px;">
            <img src="https://numatbamboo.com/numat-logo.png" alt="NUMAT" width="150" style="display:block;" />
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#1f2937;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;">
            ${cleanBody(bodyHtml)}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px;background:#f0f4f0;color:#6b7280;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;">
            NUMAT Sustainable Manufacturing Inc.<br />
            Cagayan de Oro, Philippines &middot; <a href="https://numatbamboo.com" style="color:#16361f;">numatbamboo.com</a><br /><br />
            You are receiving this because you subscribed to NUMAT updates.
            <a href="${UNSUB}" style="color:#16361f;">Unsubscribe</a>.<br />
            &copy; ${year} NUMAT Sustainable Manufacturing Inc.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function resendFetch(path: string, method: string, body: unknown) {
  if (!KEY) throw new Error('RESEND_API_KEY is not configured')
  const res = await fetch(`${RESEND_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON */ }
  if (!res.ok) {
    const msg = json?.message || json?.error?.message || text || `Resend error ${res.status}`
    throw new Error(msg)
  }
  return json
}

// Send a one-off test to a single address (uses the transactional email endpoint,
// so the unsubscribe placeholder is neutralised to a no-op link).
export async function sendNewsletterTest(args: {
  to: string
  subject: string
  html: string
}) {
  const html = args.html.split(UNSUB).join('#')
  return resendFetch('/emails', 'POST', {
    from: NEWSLETTER_FROM,
    to: args.to,
    reply_to: NEWSLETTER_REPLY_TO,
    subject: `[TEST] ${args.subject}`,
    html,
  })
}

// Create a broadcast against the audience, then send (or schedule) it.
export async function sendNewsletterBroadcast(args: {
  subject: string
  html: string
  scheduledAt?: string | null
}): Promise<{ broadcastId: string; scheduled: boolean }> {
  const created = await resendFetch('/broadcasts', 'POST', {
    audience_id: NEWSLETTER_AUDIENCE_ID,
    from: NEWSLETTER_FROM,
    reply_to: NEWSLETTER_REPLY_TO,
    subject: args.subject,
    html: args.html,
  })
  const broadcastId = created?.id
  if (!broadcastId) throw new Error('Broadcast was not created')

  await resendFetch(`/broadcasts/${broadcastId}/send`, 'POST',
    args.scheduledAt ? { scheduled_at: args.scheduledAt } : {})

  return { broadcastId, scheduled: Boolean(args.scheduledAt) }
}

// Add an opted-in subscriber to the newsletter audience. Idempotent: if the
// contact already exists, Resend upserts, so callers can treat it as success.
export async function subscribeContact(email: string, firstName?: string) {
  return resendFetch(`/audiences/${NEWSLETTER_AUDIENCE_ID}/contacts`, 'POST', {
    email: email.toLowerCase().trim(),
    first_name: firstName?.trim() || undefined,
    unsubscribed: false,
  })
}

// Current contact count on the audience, for the send confirmation.
export async function getAudienceCount(): Promise<number | null> {
  try {
    const res = await resendFetch(`/audiences/${NEWSLETTER_AUDIENCE_ID}/contacts`, 'GET', null)
    const data = res?.data ?? res
    return Array.isArray(data) ? data.length : null
  } catch {
    return null
  }
}
