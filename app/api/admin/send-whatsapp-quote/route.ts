import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppProductionQuote, formatPhoneNumber, isValidPhoneNumber } from '@/lib/twilio'

interface QuoteData {
  id: string
  quote_number: string
  status: string
  created_at: string
  valid_until: string
  total: number
  contact_count: number
  customers: {
    name: string
    phone: string
    email: string
  } | null
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quoteId, type } = body as {
      quoteId?: string
      type?: 'send' | 'reminder'
    }

    if (!quoteId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // AUTH CHECK: Ensure only allowed systems/admins can call this
    const systemApiKey = request.headers.get('x-api-key')
    if (systemApiKey !== 'automated-system-call') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. FETCH DATA
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select(`
        *,
        customers (
          name,
          phone,
          email
        )
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const typedQuote = quote as unknown as QuoteData
    const customerPhone = typedQuote.customers?.phone

    if (!customerPhone || !isValidPhoneNumber(customerPhone)) {
      return NextResponse.json({ error: 'Invalid or missing phone number' }, { status: 400 })
    }

    const formattedPhone = formatPhoneNumber(customerPhone)

    // 2. CONSTRUCT DATA
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://numatbamboo.com'
    const quoteUrl = `${baseUrl}/quote/confirmation?id=${typedQuote.id}&number=${typedQuote.quote_number}`

    const validUntilDate = new Date(typedQuote.valid_until).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

    // 3. SEND PRODUCTION MESSAGE
    const result = await sendWhatsAppProductionQuote({
      to: formattedPhone,
      customerName: typedQuote.customers?.name || 'Valued Customer',
      quoteNumber: typedQuote.quote_number,
      total: typedQuote.total.toLocaleString(),
      quoteUrl: quoteUrl,
      type: type,
      validUntil: validUntilDate
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // 4. UPDATE DATABASE
    const newContactCount = (typedQuote.contact_count || 0) + 1
    const updateData: any = {
      last_contact_date: new Date().toISOString(),
      contact_count: newContactCount,
    }

    if (type === 'send' && typedQuote.status === 'pending') {
      updateData.status = 'processing'
    }

    await supabaseAdmin
      .from('quotes')
      .update(updateData)
      .eq('id', quoteId)

    // 5. LOG COMMUNICATION
    await supabaseAdmin.from('quote_communications').insert({
      quote_id: quoteId,
      contact_type: 'whatsapp',
      message_type: type,
      status: 'sent',
      sent_to: `whatsapp:${formattedPhone}`,
      message_id: result.messageId,
    })

    return NextResponse.json({
      ok: true,
      messageId: result.messageId
    })

  } catch (error) {
    console.error('[API Error]:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}