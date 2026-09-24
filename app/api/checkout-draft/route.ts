// app/api/checkout-draft/route.ts
//
// Saves a shopper as a lead as soon as they type a valid email or phone at
// checkout, before they submit. The lead lands in master_leads (never a new
// table) with last_activity_type 'checkout_started' and the cart in a
// sales_activities row. If they go on to submit, /api/cart/quote overwrites
// last_activity_type with 'inbound_quote'. If they do not, the cron
// /api/cron/unfinished-checkouts reports them after 30 minutes so the team can
// follow up. No alert is sent from here.

import { NextRequest, NextResponse } from 'next/server'
import { upsertInboundLead } from '@/lib/leads/inbound'
import { sanitizeInput } from '@/lib/spam-detection'

export const runtime = 'nodejs'

const recent = new Map<string, number>()

type DraftItem = { name?: string; specs?: string; quantity?: number; unitPrice?: number | null }

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string
      email?: string
      phone?: string
      company?: string
      items?: DraftItem[]
      totalPhp?: number
    }

    const email = (body.email ?? '').trim().toLowerCase()
    const phone = (body.phone ?? '').trim()
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const validPhone = /^\+?\d{9,15}$/.test(phone.replace(/[\s()-]/g, ''))
    if (!validEmail && !validPhone) {
      return NextResponse.json({ ok: false, error: 'email or phone required' }, { status: 400 })
    }

    // At most one save per contact per 2 minutes (the form calls on blur).
    const key = `${email}|${phone}`
    const now = Date.now()
    if ((recent.get(key) ?? 0) > now - 120_000) return NextResponse.json({ ok: true, throttled: true })
    recent.set(key, now)

    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 30).map((it) => ({
      name: sanitizeInput(String(it.name ?? '')).slice(0, 120),
      specs: sanitizeInput(String(it.specs ?? '')).slice(0, 200),
      quantity: Math.max(0, Math.floor(Number(it.quantity) || 0)),
    }))

    await upsertInboundLead({
      email: validEmail ? email : null,
      phone: validPhone ? phone : null,
      fullName: body.name ? sanitizeInput(body.name.trim()).slice(0, 120) : null,
      company: body.company ? sanitizeInput(body.company.trim()).slice(0, 120) : null,
      sourceType: 'checkout_started',
      leadSource: 'Website checkout (not yet submitted)',
      contactChannel: 'form',
      sourcePayload: {
        items,
        total_php: typeof body.totalPhp === 'number' && Number.isFinite(body.totalPhp) ? Math.round(body.totalPhp) : null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[checkout-draft] failed', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
