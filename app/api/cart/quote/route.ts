import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { detectSpam, sanitizeInput } from '@/lib/spam-detection'
import { sendEmail, sendNotificationEmail } from '@/lib/sendgrid'
import { upsertInboundLead } from '@/lib/leads/inbound'
import { generateQuoteEmailHTML } from '@/lib/email-templates'

interface QuoteContact {
  name: string
  email: string
  phone: string
  company?: string | null
  channel: 'whatsapp' | 'email'
  application: string
  notes?: string | null
  consent: boolean
  display_currency?: string
  display_total?: number
}

interface QuoteItem {
  product_id: string | null
  product_name: string
  product_specs: string
  quantity: number
  unit_price: number
  sku?: string | null
  variant_id?: string | null
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_LIMIT_WINDOW = 60000

// Recipient alerted on every inbound website quote submission. Erica heads the
// CRM, so she gets each new request. Change this address to reroute the alert.
const INBOUND_LEAD_NOTIFY = 'erica@numat.ph'

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (record.count >= RATE_LIMIT) return false
  record.count++
  return true
}

function generateQuoteNumber(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `NB-${dateStr}-${random}`
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { contact, items } = body as { contact: QuoteContact; items: QuoteItem[] }

    const supabase = await createClient()

    if (!contact.name || !contact.email || !contact.phone) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const spamResult = detectSpam({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      message: contact.notes || '',
    })

    if (spamResult.isLikelySpam) {
      console.warn('[Anti-Spam] Quote submission detected as spam', {
        email: contact.email,
        score: spamResult.score,
        reasons: spamResult.reasons,
      })
      return NextResponse.json(
        { ok: false, error: 'Your submission could not be processed.' },
        { status: 400 }
      )
    }

    if (!isValidPhoneNumber(contact.phone)) {
      return NextResponse.json({ ok: false, error: 'Invalid phone number format' }, { status: 400 })
    }
    const phoneNumber = parsePhoneNumber(contact.phone)
    if (!phoneNumber) {
      return NextResponse.json({ ok: false, error: 'Could not parse phone number' }, { status: 400 })
    }
    const formattedPhone = phoneNumber.number

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const total = subtotal
    const quoteNumber = generateQuoteNumber()

    // Valid until = 14 days from now
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 14)

    const notes = sanitizeInput(
      [
        `Preferred channel: ${contact.channel}`,
        `Application: ${contact.application}`,
        contact.notes ? contact.notes : '',
      ]
        .filter(Boolean)
        .join('\n')
    )

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        customer_name: sanitizeInput(contact.name),
        company: contact.company ? sanitizeInput(contact.company) : null,
        email: sanitizeInput(contact.email),
        phone: formattedPhone,
        notes,
        subtotal,
        discount_amount: 0,
        discount_percent: 0,
        total,
        display_currency: contact.display_currency ?? 'PHP',
        display_total: contact.display_total ?? total,
        valid_until: validUntil.toISOString(),
      } as any)
      .select('id, quote_number')
      .single()

    if (quoteError || !quote?.id) {
      console.error('Quote Create Error:', JSON.stringify(quoteError))
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to create quote record',
          details: quoteError?.message,
          hint: quoteError?.hint,
          code: quoteError?.code,
        },
        { status: 500 }
      )
    }

    const quoteId = quote.id as string
    const createdQuoteNumber = (quote as any).quote_number ?? quoteNumber

    // Create quote items
    const quoteItems = items.map((item) => ({
      quote_id: quoteId,
      product_id: item.product_id || null,
      product_name: item.product_name,
      product_specs: item.product_specs,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      sku: item.sku ?? null,
      variant_id: item.variant_id ?? null,
    }))

    let { error: itemsError } = await supabase.from('quote_items').insert(quoteItems as any)

    if (itemsError) {
      console.warn('[Quote Items] Full insert failed, retrying minimal:', JSON.stringify(itemsError))
      const minimalItems = items.map((item) => ({
        quote_id: quoteId,
        product_id: item.product_id || null,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sku: item.sku ?? null,
        variant_id: item.variant_id ?? null,
      }))
      ;({ error: itemsError } = await supabase.from('quote_items').insert(minimalItems as any))
    }

    if (itemsError) {
      console.error('Quote Items Final Error:', JSON.stringify(itemsError))
      await supabase.from('quotes').delete().eq('id', quoteId)

      const rawMsg = itemsError.message || ''
      const isFloorBlock = rawMsg.includes('QUOTE FLOOR BLOCKED')

      return NextResponse.json(
        {
          ok: false,
          error: isFloorBlock
            ? 'One or more items are priced below the minimum. Please contact sales to adjust pricing or request an exception.'
            : 'Failed to add items',
          details: rawMsg,
          hint: (itemsError as any).hint,
          code: (itemsError as any).code,
          floor_blocked: isFloorBlock,
        },
        { status: isFloorBlock ? 422 : 500 }
      )
    }

    // Create or update the CRM lead in master_leads with attribution and an
    // owner, so this quote appears on a rep board and is tracked for productivity.
    try {
      await upsertInboundLead({
        email: contact.email,
        phone: formattedPhone,
        fullName: contact.name,
        company: contact.company || null,
        sourceType: 'inbound_quote',
        leadSource: 'Website Quote Form',
        contactChannel: contact.channel || 'form',
        sourcePayload: {
          quote_id: quoteId,
          quote_number: createdQuoteNumber,
          channel: contact.channel ?? null,
          application: contact.application ?? null,
          item_count: items.length,
          display_currency: contact.display_currency ?? 'PHP',
          display_total: contact.display_total ?? total,
        },
        notes: contact.notes || null,
      })
    } catch (leadErr) {
      console.error('[Quote -> master_leads] Failed:', leadErr)
    }

    // Notify the inbound lead owner on every website quote submission,
    // whichever delivery channel the visitor picked. This is a side alert:
    // a failure here must never break the submission, so it is caught and logged.
    try {
      const esc = (s: string | null | undefined) =>
        String(s ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')

      const itemRows = items
        .map(
          (it) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${esc(it.product_name)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#555;">${esc(it.product_specs)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${it.quantity}</td>
      </tr>`
        )
        .join('')

      const notifyHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px;">
      <h2 style="margin:0 0 4px;">New quote request from the website</h2>
      <p style="margin:0 0 16px;color:#555;">Reference ${esc(createdQuoteNumber)}</p>
      <table style="border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:4px 12px 4px 0;color:#555;">Name</td><td style="padding:4px 0;"><strong>${esc(contact.name)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555;">Company</td><td style="padding:4px 0;">${esc(contact.company) || 'Not given'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555;">Email</td><td style="padding:4px 0;">${esc(contact.email)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555;">Phone</td><td style="padding:4px 0;">${esc(formattedPhone)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555;">Preferred channel</td><td style="padding:4px 0;">${esc(contact.channel)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555;">Application</td><td style="padding:4px 0;">${esc(contact.application) || 'Not given'}</td></tr>
      </table>
      ${contact.notes ? `<p style="margin:0 0 16px;"><span style="color:#555;">Notes:</span><br>${esc(contact.notes)}</p>` : ''}
      <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #111;">Product</th>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #111;">Specs</th>
            <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #111;">Qty</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p style="margin:0;color:#555;">Preview total ${esc(contact.display_currency ?? 'USD')} ${Math.round(
        contact.display_total ?? total
      ).toLocaleString()}</p>
    </div>`

      await sendNotificationEmail({
        to: INBOUND_LEAD_NOTIFY,
        subject: `New quote request: ${contact.name}${contact.company ? ` (${contact.company})` : ''}`,
        html: notifyHtml,
      })
      console.log(`[Inbound Lead Notify] Sent to ${INBOUND_LEAD_NOTIFY} for ${createdQuoteNumber}`)
    } catch (notifyErr) {
      console.error('[Inbound Lead Notify] Failed to send:', notifyErr)
    }

    // Send email directly
    if (contact.channel === 'email') {
      try {
        const displayCurrency = contact.display_currency ?? 'USD'
        const displayTotal = contact.display_total ?? total
        const conversionRatio = total > 0 ? displayTotal / total : 1

        const quoteDate = new Date().toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const validUntilFormatted = validUntil.toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        const htmlContent = generateQuoteEmailHTML({
          customerName: contact.name,
          quoteNumber: createdQuoteNumber,
          quoteDate,
          validUntil: validUntilFormatted,
          // Every amount handed to the template below is already multiplied by
          // conversionRatio, so it must be labelled with the currency that
          // ratio converted into, not the PHP base.
          currency: contact.display_currency ?? 'PHP',
          subtotal: Math.round(subtotal * conversionRatio),
          total: Math.round(displayTotal),
          recipientEmail: contact.email,
          items: items.map((item) => ({
            productName: item.product_name,
            productSpecs: item.product_specs,
            quantity: item.quantity,
            unitPrice: Math.round((item.unit_price ?? 0) * conversionRatio),
            totalPrice: Math.round(item.quantity * (item.unit_price ?? 0) * conversionRatio),
          })),
        })

        await sendEmail({
          to: contact.email,
          subject: `Your Quote #${createdQuoteNumber} from NUMAT Bamboo`,
          html: htmlContent,
          attachments: [],
        })

        console.log(`[Quote Email] Sent successfully to ${contact.email}`)
      } catch (emailErr) {
        console.error('[Quote Email] Failed to send:', emailErr)
      }
    }

    return NextResponse.json({
      ok: true,
      quoteId,
      quoteNumber: createdQuoteNumber,
      total,
      message: `Quote created successfully`,
    })
  } catch (error) {
    console.error('Unexpected Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const quoteId = searchParams.get('id')
  const quoteNumber = searchParams.get('number')

  if (!quoteId && !quoteNumber) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    let query = supabase.from('quotes').select(`*, customers(*), quote_items(*)`)
    if (quoteId) query = query.eq('id', quoteId)
    else if (quoteNumber) query = query.eq('quote_number', quoteNumber)

    const { data, error } = await query.single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err: any) {
    let query = supabase.from('quotes').select(`*, quote_items(*)`)
    if (quoteId) query = query.eq('id', quoteId)
    else if (quoteNumber) query = query.eq('quote_number', quoteNumber)

    const { data, error } = await query.single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }
}