import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendNewsletterTest,
  sendNewsletterToRecipients,
  resolveRecipients,
  listSubscribers,
  NEWSLETTER_FROM,
  NEWSLETTER_CATEGORIES,
} from '@/lib/newsletter'

const ALLOWED = new Set(['admin', 'marketing'])

async function role(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('admin_profiles').select('role').eq('id', user.id).maybeSingle()
  return data?.role ?? null
}

export async function GET() {
  const supabase = await createClient()
  const r = await role(supabase)
  if (!r || !ALLOWED.has(r)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const subs = (await listSubscribers()).filter((s) => s.status === 'subscribed')
  const counts: Record<string, number> = {}
  for (const c of NEWSLETTER_CATEGORIES) counts[c] = subs.filter((s) => (s.categories || []).includes(c)).length
  return NextResponse.json({ from: NEWSLETTER_FROM, audienceCount: subs.length, categories: NEWSLETTER_CATEGORIES, counts })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const r = await role(supabase)
  if (!r || !ALLOWED.has(r)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const action = String(body.action || '')
  const subject = String(body.subject || '').trim()
  const previewText = String(body.previewText || '').trim()
  const bodyHtml = String(body.bodyHtml || '').trim()

  if (!subject) return NextResponse.json({ error: 'A subject is required.' }, { status: 400 })
  if (!bodyHtml) return NextResponse.json({ error: 'The newsletter body is empty.' }, { status: 400 })

  try {
    if (action === 'test') {
      const to = String(body.testEmail || '').trim()
      if (!to || !to.includes('@')) return NextResponse.json({ error: 'Enter a valid test email address.' }, { status: 400 })
      await sendNewsletterTest({ to, subject, bodyHtml, previewText })
      return NextResponse.json({ ok: true, message: `Test sent to ${to}.` })
    }

    if (action === 'send') {
      const sendTo = body.sendTo || { mode: 'all' }
      const mode = ['all', 'categories', 'emails'].includes(sendTo.mode) ? sendTo.mode : 'all'
      const recipients = await resolveRecipients({
        mode,
        categories: Array.isArray(sendTo.categories) ? sendTo.categories : [],
        emails: Array.isArray(sendTo.emails) ? sendTo.emails : [],
      })
      if (recipients.length === 0) {
        return NextResponse.json({ error: 'No subscribers match that selection.' }, { status: 400 })
      }
      const { sent } = await sendNewsletterToRecipients({ subject, bodyHtml, previewText, recipients })
      return NextResponse.json({ ok: true, message: `Newsletter sent to ${sent} subscriber${sent === 1 ? '' : 's'}.` })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to process the newsletter.' }, { status: 500 })
  }
}

// Recipient count preview for the composer (before sending).
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const r = await role(supabase)
  if (!r || !ALLOWED.has(r)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ count: 0 }) }
  const sendTo = body.sendTo || { mode: 'all' }
  const mode = ['all', 'categories', 'emails'].includes(sendTo.mode) ? sendTo.mode : 'all'
  const recipients = await resolveRecipients({
    mode,
    categories: Array.isArray(sendTo.categories) ? sendTo.categories : [],
    emails: Array.isArray(sendTo.emails) ? sendTo.emails : [],
  })
  return NextResponse.json({ count: recipients.length })
}
