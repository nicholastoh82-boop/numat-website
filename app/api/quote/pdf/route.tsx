import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuotePDF } from '@/lib/pdf-utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const quoteId = searchParams.get('id')

  if (!quoteId) {
    return NextResponse.json({ error: 'Quote ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  let data: any = null

  try {
    const { data: result, error } = await supabase
      .from('quotes')
      .select(`*, customers(*), quote_items(*)`)
      .eq('id', quoteId)
      .single()

    if (error) throw error
    data = result
  } catch (err) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('quotes')
      .select(`*, quote_items(*)`)
      .eq('id', quoteId)
      .single()

    if (fallbackError || !fallback) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }
    data = fallback
  }

  if (!data) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  try {
    const pdfBuffer = await generateQuotePDF(data)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quote-${data.quote_number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF Generation Error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}