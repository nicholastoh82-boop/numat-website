// Newsletter: subscribers live in our database (newsletter_subscribers) so they can
// carry categories and be targeted. Resend delivers the mail. Targeted sends go via
// Resend's batch email API with a per-recipient unsubscribe link handled by our own
// HMAC unsubscribe system, and anyone unsubscribed or on the bounce suppression list
// is skipped.

import { generateToken } from '@/lib/unsubscribe'

const RESEND_API = 'https://api.resend.com'
const KEY = process.env.RESEND_API_KEY
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://numatbamboo.com'

export const NEWSLETTER_FROM = process.env.RESEND_NEWSLETTER_FROM || 'NUMAT <contact@numat.ph>'
export const NEWSLETTER_REPLY_TO = process.env.RESEND_NEWSLETTER_REPLY_TO || 'contact@numat.ph'

export const NEWSLETTER_CATEGORIES = [
  'Architects and Designers',
  'Furniture Manufacturers',
  'Developers and Contractors',
  'Existing Customers',
  'Distributors and Partners',
  'General',
] as const

export type Subscriber = {
  email: string
  first_name: string | null
  last_name: string | null
  categories: string[]
  status: string
}

// ---- Supabase (service role) REST helpers ----
async function sb(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ---- Subscribers ----
export async function upsertSubscriber(email: string, firstName?: string, source = 'website') {
  const e = email.toLowerCase().trim()
  // Resolve unsubscribed -> subscribed on a fresh opt-in; keep existing categories.
  await sb('newsletter_subscribers?on_conflict=email', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      email: e,
      first_name: firstName?.trim() || null,
      status: 'subscribed',
      source,
      updated_at: new Date().toISOString(),
    }),
  })
}

export async function listSubscribers(): Promise<Subscriber[]> {
  return (await sb('newsletter_subscribers?select=email,first_name,last_name,categories,status&order=created_at.desc')) || []
}

export async function setSubscriberCategories(email: string, categories: string[]) {
  const e = encodeURIComponent(email.toLowerCase().trim())
  await sb(`newsletter_subscribers?email=eq.${e}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ categories, updated_at: new Date().toISOString() }),
  })
}

export async function setUnsubscribed(email: string) {
  const e = encodeURIComponent(email.toLowerCase().trim())
  await sb(`newsletter_subscribers?email=eq.${e}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'unsubscribed', updated_at: new Date().toISOString() }),
  })
}

// Resolve the recipient set for a send, minus unsubscribed and bounce-suppressed.
export async function resolveRecipients(sendTo: {
  mode: 'all' | 'categories' | 'emails'
  categories?: string[]
  emails?: string[]
}): Promise<Subscriber[]> {
  let q = 'newsletter_subscribers?select=email,first_name,last_name,categories,status&status=eq.subscribed'
  if (sendTo.mode === 'categories' && sendTo.categories?.length) {
    const cats = sendTo.categories.map((c) => `"${c.replace(/"/g, '')}"`).join(',')
    q += `&categories=ov.{${encodeURIComponent(cats)}}`
  } else if (sendTo.mode === 'emails' && sendTo.emails?.length) {
    const list = sendTo.emails.map((e) => e.toLowerCase().trim()).join(',')
    q += `&email=in.(${encodeURIComponent(list)})`
  }
  const subs: Subscriber[] = (await sb(q)) || []
  if (subs.length === 0) return []

  // Drop bounce-suppressed addresses.
  const emails = subs.map((s) => s.email.toLowerCase())
  const inList = emails.map((e) => e.replace(/,/g, '')).join(',')
  const suppressed: { email: string }[] =
    (await sb(`suppressed_emails?select=email&email=in.(${encodeURIComponent(inList)})`)) || []
  const supSet = new Set(suppressed.map((s) => s.email.toLowerCase()))
  return subs.filter((s) => !supSet.has(s.email.toLowerCase()))
}

// ---- Unsubscribe link (reuses the HMAC token system) ----
export function unsubscribeUrl(email: string): string {
  const token = generateToken(email, 'newsletter')
  return `${SITE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
}

// ---- Email shell ----
export function wrapNewsletterHtml(bodyHtml: string, previewText = '', unsubUrl = '#'): string {
  const year = new Date().getFullYear()
  const clean = (bodyHtml || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/ on[a-z]+="[^"]*"/gi, '')
    .replace(/ on[a-z]+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" />
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}</div>` : ''}
</head><body style="margin:0;padding:0;background:#f4f6f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f4;padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">
<tr><td style="background:#16361f;padding:22px 28px;"><img src="https://numatbamboo.com/numat-logo.png" alt="NUMAT" width="150" style="display:block;" /></td></tr>
<tr><td style="padding:28px;color:#1f2937;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;">${clean}</td></tr>
<tr><td style="padding:20px 28px;background:#f0f4f0;color:#6b7280;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;">
NUMAT Sustainable Manufacturing Inc.<br />Cagayan de Oro, Philippines &middot; <a href="https://numatbamboo.com" style="color:#16361f;">numatbamboo.com</a><br /><br />
You are receiving this because you subscribed to NUMAT updates. <a href="${unsubUrl}" style="color:#16361f;">Unsubscribe</a>.<br />&copy; ${year} NUMAT Sustainable Manufacturing Inc.
</td></tr></table></td></tr></table></body></html>`
}

// ---- Resend sending ----
async function resendFetch(path: string, method: string, body: unknown) {
  if (!KEY) throw new Error('RESEND_API_KEY is not configured')
  const res = await fetch(`${RESEND_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-json */ }
  if (!res.ok) throw new Error(json?.message || json?.error?.message || text || `Resend ${res.status}`)
  return json
}

export async function sendNewsletterTest(args: { to: string; subject: string; bodyHtml: string; previewText?: string }) {
  const html = wrapNewsletterHtml(args.bodyHtml, args.previewText, '#')
  return resendFetch('/emails', 'POST', {
    from: NEWSLETTER_FROM,
    to: args.to,
    reply_to: NEWSLETTER_REPLY_TO,
    subject: `[TEST] ${args.subject}`,
    html,
  })
}

// Batch send to a resolved recipient set, each with its own unsubscribe link.
export async function sendNewsletterToRecipients(args: {
  subject: string
  bodyHtml: string
  previewText?: string
  recipients: Subscriber[]
}): Promise<{ sent: number }> {
  const chunks: Subscriber[][] = []
  for (let i = 0; i < args.recipients.length; i += 100) chunks.push(args.recipients.slice(i, i + 100))

  let sent = 0
  for (const chunk of chunks) {
    const batch = chunk.map((r) => {
      const url = unsubscribeUrl(r.email)
      return {
        from: NEWSLETTER_FROM,
        to: [r.email],
        reply_to: NEWSLETTER_REPLY_TO,
        subject: args.subject,
        html: wrapNewsletterHtml(args.bodyHtml, args.previewText, url),
        headers: {
          'List-Unsubscribe': `<${url}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })
    await resendFetch('/emails/batch', 'POST', batch)
    sent += chunk.length
  }
  return { sent }
}
