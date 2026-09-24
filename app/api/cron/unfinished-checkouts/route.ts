// app/api/cron/unfinished-checkouts/route.ts
//
// Every 30 minutes: finds shoppers who typed their email or phone at checkout
// (see /api/checkout-draft) but did not submit within 30 minutes. Each one is
// added to the website tab of the sales tracker as "Unfinished checkout" and
// all of them go out in one alert email to WEBSITE_ALERT_RECIPIENTS, so the
// team can follow up. Leads are then marked checkout_unfinished so they are
// reported once. Looks back 3 days at most.

import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/sendgrid'
import { WEBSITE_ALERT_RECIPIENTS, escapeHtml, logWebsiteSubmission } from '@/lib/leads/website-intake'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function headers(extra: Record<string, string> = {}) {
  return { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...extra }
}

type Lead = { id: string; email: string | null; phone: string | null; full_name: string | null; company: string | null; last_activity_at: string }
type Payload = { items?: Array<{ name: string; specs?: string; quantity: number }>; total_php?: number | null }

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const now = Date.now()
  const olderThan = new Date(now - 30 * 60_000).toISOString()
  const newerThan = new Date(now - 3 * 24 * 3_600_000).toISOString()

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/master_leads?last_activity_type=eq.checkout_started` +
      `&last_activity_at=lt.${encodeURIComponent(olderThan)}&last_activity_at=gt.${encodeURIComponent(newerThan)}` +
      `&select=id,email,phone,full_name,company,last_activity_at&order=last_activity_at.asc&limit=50`,
    { headers: headers() },
  )
  if (!res.ok) return NextResponse.json({ error: `lead query ${res.status}` }, { status: 500 })
  const leads = (await res.json()) as Lead[]
  if (leads.length === 0) return NextResponse.json({ ok: true, reported: 0 })

  const reported: Array<Lead & { payload: Payload }> = []
  for (const lead of leads) {
    let payload: Payload = {}
    const act = await fetch(
      `${SUPABASE_URL}/rest/v1/sales_activities?lead_id=eq.${lead.id}&activity_type=eq.checkout_started&select=payload&order=created_at.desc&limit=1`,
      { headers: headers() },
    )
    if (act.ok) payload = ((await act.json()) as Array<{ payload: Payload | null }>)[0]?.payload ?? {}

    await logWebsiteSubmission({
      type: 'Unfinished checkout',
      source: 'Website checkout, not submitted',
      name: lead.full_name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      items: payload.items ?? [],
      orderValuePhp: payload.total_php ?? null,
      message: 'Started checkout but did not submit. Follow up to help them finish their order.',
    })

    // Report each lead once.
    await fetch(`${SUPABASE_URL}/rest/v1/master_leads?id=eq.${lead.id}&last_activity_type=eq.checkout_started`, {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ last_activity_type: 'checkout_unfinished' }),
    })
    reported.push({ ...lead, payload })
  }

  try {
    const rows = reported
      .map((l) => {
        const items = (l.payload.items ?? []).map((it) => `${it.quantity} x ${it.name}`).join(', ') || 'Not captured'
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(l.full_name) || 'Not given'}${l.company ? `<br><span style="color:#555;">${escapeHtml(l.company)}</span>` : ''}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(l.email) || ''}<br>${escapeHtml(l.phone) || ''}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(items)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${l.payload.total_php ? `PHP ${Math.round(l.payload.total_php).toLocaleString()}` : ''}</td>
        </tr>`
      })
      .join('')
    await sendNotificationEmail({
      to: WEBSITE_ALERT_RECIPIENTS,
      subject: `${reported.length} unfinished website checkout${reported.length === 1 ? '' : 's'} to follow up`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:720px;">
        <h2 style="margin:0 0 8px;">Unfinished checkouts</h2>
        <p style="margin:0 0 16px;color:#555;">These shoppers entered their details at checkout but did not submit their order within 30 minutes. They are also on the website tab of the sales tracker.</p>
        <table style="border-collapse:collapse;width:100%;">
          <thead><tr>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #111;">Name</th>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #111;">Contact</th>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #111;">In their order</th>
            <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #111;">Value</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`,
    })
  } catch (err) {
    console.error('[unfinished-checkouts] alert email failed', err)
  }

  return NextResponse.json({ ok: true, reported: reported.length })
}
