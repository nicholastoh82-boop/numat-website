import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ShareData {
  quoteId: string
  channel: 'whatsapp' | 'viber'
  phoneNumber?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ShareData = await request.json()
    const { quoteId, channel, phoneNumber } = body

    if (!quoteId || !channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`*, customers(*)`)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const customerPhone = phoneNumber || quote.customers?.phone
    if (!customerPhone) {
      return NextResponse.json({ error: 'Customer phone not available' }, { status: 400 })
    }

    // Generate share message
    const message = encodeURIComponent(
      `Hi ${quote.customers?.name || 'there'},\n\nWe have prepared a quote for you:\n\n` +
      `Quote #: ${quote.quote_number}\n` +
      `Amount: PHP ${quote.total?.toLocaleString()}\n` +
      `Valid Until: ${new Date(quote.valid_until).toLocaleDateString()}\n\n` +
      `Please see the attached PDF for details.\n\n` +
      `Best regards,\nNUBAMBU Team`
    )

    const cleanPhone = customerPhone.replace(/[^\d+]/g, '')

    let shareUrl = ''
    if (channel === 'whatsapp') {
      shareUrl = `https://wa.me/${cleanPhone}?text=${message}`
    } else if (channel === 'viber') {
      shareUrl = `viber://chat?number=${cleanPhone}&text=${message}`
    }

    // Log the share action in database (optional)
    try {
      await supabase
        .from('quote_interactions')
        .insert({
          quote_id: quoteId,
          action: 'shared',
          channel,
          created_at: new Date().toISOString(),
        })
        .single()
    } catch (error) {
      // If table doesn't exist, that's ok - just log to share URL
      console.log('Quote interactions not logged (table may not exist)')
    }

    return NextResponse.json({
      ok: true,
      shareUrl,
      message: `Share link generated for ${channel}`
    })

  } catch (error) {
    console.error('Share Quote Error:', error)
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 })
  }
}
