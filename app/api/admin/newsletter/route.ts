import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  wrapNewsletterHtml,
  sendNewsletterTest,
  sendNewsletterBroadcast,
  getAudienceCount,
  NEWSLETTER_FROM,
} from '@/lib/newsletter'

// Only admins and the marketing role may compose or send newsletters.
async function getRole(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.role ?? null
}

const ALLOWED = new Set(['admin', 'marketing'])

export async function GET() {
  const supabase = await createClient()
  const role = await getRole(supabase)
  if (!role || !ALLOWED.has(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await getAudienceCount()
  return NextResponse.json({ from: NEWSLETTER_FROM, audienceCount: count })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const role = await getRole(supabase)
  if (!role || !ALLOWED.has(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const action = String(body.action || '')
  const subject = String(body.subject || '').trim()
  const previewText = String(body.previewText || '').trim()
  const bodyHtml = String(body.bodyHtml || '').trim()

  if (!subject) return NextResponse.json({ error: 'A subject is required.' }, { status: 400 })
  if (!bodyHtml) return NextResponse.json({ error: 'The newsletter body is empty.' }, { status: 400 })

  const html = wrapNewsletterHtml(bodyHtml, previewText)

  try {
    if (action === 'test') {
      const to = String(body.testEmail || '').trim()
      if (!to || !to.includes('@')) {
        return NextResponse.json({ error: 'Enter a valid test email address.' }, { status: 400 })
      }
      await sendNewsletterTest({ to, subject, html })
      return NextResponse.json({ ok: true, message: `Test sent to ${to}.` })
    }

    if (action === 'send') {
      const scheduledAt = body.scheduledAt ? String(body.scheduledAt) : null
      const result = await sendNewsletterBroadcast({ subject, html, scheduledAt })
      return NextResponse.json({
        ok: true,
        broadcastId: result.broadcastId,
        message: result.scheduled
          ? 'Newsletter scheduled.'
          : 'Newsletter is sending to the list.',
      })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to process the newsletter.' },
      { status: 500 },
    )
  }
}
