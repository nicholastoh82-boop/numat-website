import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FX_FLOOR_PHP_PER_USD = 55

interface CrmQuoteItem {
  variantId: string | null
  productName: string
  sku: string
  qty: number
  unitPriceUsd: number
  exFactoryPhp: number | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { leadId, items, notes, issuedBy } = body as {
      leadId: string
      items: CrmQuoteItem[]
      notes?: string
      issuedBy: string
    }

    if (!leadId || !items?.length) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Server-side floor guard
    for (const item of items) {
      if (item.exFactoryPhp && item.unitPriceUsd > 0) {
        if (item.unitPriceUsd * FX_FLOOR_PHP_PER_USD < item.exFactoryPhp) {
          const minPrice = (item.exFactoryPhp / FX_FLOOR_PHP_PER_USD).toFixed(2)
          return NextResponse.json({
            ok: false,
            error: `${item.sku} is below the minimum price floor. Minimum: $${minPrice} USD at ₱${FX_FLOOR_PHP_PER_USD}/USD.`,
            floor_blocked: true,
          }, { status: 422 })
        }
      }
    }

    // Get lead
    const { data: lead, error: leadError } = await supabase
      .from('master_leads')
      .select('email, full_name, first_name, company, phone')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ ok: false, error: 'Lead not found' }, { status: 404 })
    }

    const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPriceUsd, 0)
    const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        customer_name: lead.full_name || lead.first_name || 'Unknown',
        company: lead.company || null,
        email: lead.email,
        phone: lead.phone || null,
        notes: notes || null,
        subtotal,
        discount_amount: 0,
        discount_percent: 0,
        total: subtotal,
        display_currency: 'USD',
        display_total: subtotal,
        valid_until: validUntil,
      } as any)
      .select('id, quote_number')
      .single()

    if (quoteError || !quote) {
      console.error('[CRM Quote] Create error:', quoteError)
      return NextResponse.json({ ok: false, error: 'Failed to create quote record' }, { status: 500 })
    }

    const quoteId = quote.id as string
    const quoteNumber = (quote as any).quote_number as string

    // Create quote items
    const quoteItems = items.map(item => ({
      quote_id: quoteId,
      product_name: item.productName,
      product_specs: item.sku,
      quantity: item.qty,
      unit_price: item.unitPriceUsd,
      total_price: item.qty * item.unitPriceUsd,
      sku: item.sku,
      variant_id: item.variantId || null,
    }))

    const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems as any)

    if (itemsError) {
      console.error('[CRM Quote] Items error:', itemsError)
      // Rollback quote
      await supabase.from('quotes').delete().eq('id', quoteId)
      return NextResponse.json({ ok: false, error: 'Failed to save quote items' }, { status: 500 })
    }

    // Update master_leads
    const PHP_RATE = 56
    const { error: leadUpdateError } = await supabase
      .from('master_leads')
      .update({
        pipeline_stage: 'proposal_sent',
        status: 'active',
        deal_value_php: Math.round(subtotal * PHP_RATE),
        deal_value_usd: Math.round(subtotal),
        quoted_at: new Date().toISOString(),
        quote_currency: 'USD',
        quote_notes: notes || null,
        quote_issued_by: issuedBy,
        last_activity_at: new Date().toISOString(),
      } as any)
      .eq('id', leadId)

    if (leadUpdateError) {
      console.warn('[CRM Quote] Lead update warning:', leadUpdateError)
    }

    return NextResponse.json({ ok: true, quoteId, quoteNumber })
  } catch (error) {
    console.error('[CRM Quote] Unexpected error:', error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
