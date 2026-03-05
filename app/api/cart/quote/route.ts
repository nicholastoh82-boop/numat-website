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
}

interface QuoteItem {
  product_id: string
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

/**
 * Helper to extract strict schema requirements from a specs string.
 * Schema requires: size (text), thickness_mm (numeric), ply (text).
 * If we can't parse them, we provide defaults to prevent database errors.
 */
function parseSpecs(specs: string | undefined | null) {
  if (!specs) return { size: 'Standard', thickness_mm: 0, ply: 'N/A' }

  // Simple heuristic parsing (adjust regex based on your actual specs format)
  // Example spec: "4'x8' x 18mm x 1ply"

  // Try to find mm
  const mmMatch = specs.match(/(\d+(\.\d+)?)mm/i)
  const thickness_mm = mmMatch ? parseFloat(mmMatch[1]) : 0

  // Try to find size (e.g., 4x8 or 1220x2440)
  // This is just a fallback; ideal is if 'size' was passed explicitly.
  const size = specs.includes("4'x8'") ? "4'x8'" : (specs.split('x')[0] || "Standard").trim()

  // Try to find ply
  const plyMatch = specs.match(/(\d+)\s*ply/i)
  const ply = plyMatch ? `${plyMatch[1]} Ply` : 'N/A'

  return { size, thickness_mm, ply }
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

    // Validation
    if (!contact.name || !contact.email || !contact.phone) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Spam detection on contact info
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

    let customerId: string | null = null

    // 1. Customer Upsert
    // Schema mapping: preferred_channel (not channel), consent_marketing (not consent)
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', contact.email)
      .single()

    const customerData = {
      name: sanitizeInput(contact.name),
      email: sanitizeInput(contact.email),
      phone: formattedPhone,
      company: contact.company ? sanitizeInput(contact.company) : null,
      company_name: contact.company ? sanitizeInput(contact.company) : null, // Filling both to be safe due to schema ambiguity
      preferred_channel: contact.channel,
      consent_marketing: contact.consent,
      // Map channel to specific columns if needed by your business logic, though 'preferred_channel' covers it
      whatsapp: contact.channel === 'whatsapp' ? formattedPhone : null,
      viber: contact.channel === 'viber' ? formattedPhone : null,
      updated_at: new Date().toISOString(),
    }

    if (existingCustomer) {
      customerId = existingCustomer.id
      const { error: updateError } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerId)

      if (updateError) {
        console.error('Customer Update Error:', updateError)
        return NextResponse.json({ ok: false, error: 'Failed to update customer', details: updateError.message }, { status: 500 })
      }
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert(customerData)
        .select('id')
        .single()

      if (customerError) {
        console.error('Customer Create Error:', customerError)
        return NextResponse.json({ ok: false, error: 'Failed to create customer record', details: customerError.message }, { status: 500 })
      }
      customerId = newCustomer.id
    }

    // 2. Calculations
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

    // Volume Discount Logic
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

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 14)

    // 3. Create Quote
    // Schema mapping: delivery_channel (not delivery_method), status='pending'
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        customer_id: customerId,
        status: 'pending',
        delivery_channel: contact.channel,
        application: sanitizeInput(contact.application),
        subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        total,
        notes: contact.notes ? sanitizeInput(contact.notes) : null,
        valid_until: validUntil.toISOString(),
      })
      .select('id')
      .single()

    if (quoteError) {
      console.error('Quote Create Error:', quoteError)
      return NextResponse.json(
        { ok: false, error: 'Failed to create quote record', details: quoteError.message },
        { status: 500 }
      )
    }

    // 4. Create Quote Items
    // CRITICAL: Schema requires 'title', 'size', 'thickness_mm', 'ply', 'line_total' to be NOT NULL
    const quoteItems = items.map(item => {
      const parsed = parseSpecs(item.product_specs)

      return {
        quote_id: quote.id,
        product_id: item.product_id || null,
        sku: item.sku || null,

        // Mapped fields
        title: item.product_name, // Maps to 'title'
        product_name: item.product_name, // Also save to product_name if schema has it (redundancy)
        product_specs: item.product_specs,

        // Parsed fields (Required NOT NULL by schema)
        size: parsed.size,
        thickness_mm: parsed.thickness_mm,
        ply: parsed.ply,

        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price, // Maps to 'line_total'
        total_price: item.quantity * item.unit_price, // Redundancy
      }
    })

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems)

    if (itemsError) {
      console.error('Quote Items Error:', itemsError)
      // Attempt cleanup
      await supabase.from('quotes').delete().eq('id', quote.id)
      return NextResponse.json(
        { ok: false, error: 'Failed to add items', details: itemsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      quoteId: quote.id,
      quoteNumber,
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

  let query = supabase
    .from('quotes')
    .select(`*, customers(*), quote_items(*)`)

  if (quoteId) query = query.eq('id', quoteId)
  else if (quoteNumber) query = query.eq('quote_number', quoteNumber)

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}
