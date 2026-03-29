import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { detectSpam, sanitizeInput } from '@/lib/spam-detection'

interface QuoteContact {
  name: string
  email: string
  phone: string
  company?: string | null
  channel: 'whatsapp' | 'viber' | 'email'
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
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_LIMIT_WINDOW = 60000

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

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    let discountPercent = 0
    if (totalQuantity >= 500) discountPercent = 15
    else if (totalQuantity >= 200) discountPercent = 10
    else if (totalQuantity >= 100) discountPercent = 7
    else if (totalQuantity >= 50) discountPercent = 5
    else if (totalQuantity >= 20) discountPercent = 3

    const discountAmount = Math.round(subtotal * (discountPercent / 100))
    const total = subtotal - discountAmount
    const quoteNumber = generateQuoteNumber()

    const notes = sanitizeInput(
      [
        `Preferred channel: ${contact.channel}`,
        `Application: ${contact.application}`,
        contact.notes ? contact.notes : '',
      ]
        .filter(Boolean)
        .join('\n')
    )

    // Create quote — save all calculated totals
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        customer_name: sanitizeInput(contact.name),
        company: contact.company ? sanitizeInput(contact.company) : null,
        email: sanitizeInput(contact.email),
        phone: formattedPhone,
        notes,
        subtotal,
        discount_amount: discountAmount,
        discount_percent: discountPercent,
        total,
        display_currency: contact.display_currency ?? 'USD',
        display_total: contact.display_total ?? total,
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
      }))
      ;({ error: itemsError } = await supabase.from('quote_items').insert(minimalItems as any))
    }

    if (itemsError) {
      console.error('Quote Items Final Error:', JSON.stringify(itemsError))
      await supabase.from('quotes').delete().eq('id', quoteId)
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to add items',
          details: itemsError.message,
          hint: (itemsError as any).hint,
          code: (itemsError as any).code,
        },
        { status: 500 }
      )
    }

    // Send email if channel is email
    if (contact.channel === 'email') {
      try {
        const origin = request.nextUrl.origin
        await fetch(`${origin}/api/admin/send-quote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'automated-system-call',
          },
          body: JSON.stringify({
            quoteId,
            type: 'send',
            channel: 'email',
          }),
        })
      } catch (err) {
        console.warn('Quote created but email send failed:', err)
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