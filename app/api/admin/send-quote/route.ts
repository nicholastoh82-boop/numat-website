import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js' // Use base client for Admin access
import { sendEmail } from '@/lib/sendgrid'
import { generateQuoteEmailHTML, generateReminderEmailHTML } from '@/lib/email-templates'
import { generateQuotePDF } from '@/lib/pdf-utils'

// Initialize the Admin Client (Bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use Service Role Key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Rate limiting for email sending
const emailRateLimitMap = new Map<string, { count: number; resetTime: number }>()
const EMAIL_RATE_LIMIT = 20 // max emails per minute per quote
const EMAIL_RATE_LIMIT_WINDOW = 60000 // 1 minute

function checkEmailRateLimit(quoteId: string): boolean {
  const now = Date.now()
  const record = emailRateLimitMap.get(quoteId)
  
  if (!record || now > record.resetTime) {
    emailRateLimitMap.set(quoteId, { count: 1, resetTime: now + EMAIL_RATE_LIMIT_WINDOW })
    return true
  }
  
  if (record.count >= EMAIL_RATE_LIMIT) {
    return false
  }
  
  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quoteId, type, channel } = body

    if (!quoteId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Rate limit check
    if (!checkEmailRateLimit(quoteId)) {
      console.warn(`[Rate Limit] Too many email sends attempted for quote: ${quoteId}`)
      return NextResponse.json(
        { error: 'Too many email requests. Please wait before trying again.' },
        { status: 429 }
      )
    }

    // AUTH CHECK: Allow if it's a System Call
    const systemApiKey = request.headers.get('x-api-key')
    const isSystemCall = systemApiKey === 'automated-system-call'

    if (!isSystemCall) {
      console.error('Unauthorized access attempt to send-quote API')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delegate WhatsApp requests
    if (channel === 'whatsapp') {
      return NextResponse.json({
        error: 'Use /api/admin/send-whatsapp-quote endpoint for WhatsApp messages',
      }, { status: 400 })
    }

    // 2. FETCH DATA (Using Admin Client to ensure we can read all records)
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select(`
        *,
        customers (
          name,
          email,
          phone,
          company_name
        ),
        quote_items (
          product_name,
          product_specs,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      console.error('Quote Fetch Error:', quoteError)
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const typedQuote = quote as any;
    const customerEmail = typedQuote.customers?.email;

    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 });
    }

    // --- DATE FORMATTING ---
    const formattedDate = typedQuote.created_at
      ? new Date(typedQuote.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      : new Date().toLocaleDateString('en-PH');

    const formattedExpiry = typedQuote.valid_until
      ? new Date(typedQuote.valid_until).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-PH');

    const quoteEmailData = {
      customerName: typedQuote.customers?.name ?? 'Valued Customer',
      quoteNumber: typedQuote.quote_number,
      quoteDate: formattedDate,
      validUntil: formattedExpiry,
      subtotal: typedQuote.subtotal || 0,
      discountAmount: typedQuote.discount_amount || 0,
      discountPercent: typedQuote.discount_percent || 0,
      total: typedQuote.total || 0,
      recipientEmail: customerEmail,
      items: (typedQuote.quote_items || []).map((item: any) => ({
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
      })),
    };

    // 3. GENERATE PDF
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateQuotePDF(typedQuote);
    } catch (pdfError) {
      console.error('PDF Generation Error:', pdfError);
    }

    // 4. GENERATE EMAIL HTML
    const htmlContent = type === 'reminder'
      ? generateReminderEmailHTML(quoteEmailData)
      : generateQuoteEmailHTML(quoteEmailData);

    // 5. SEND EMAIL via SENDGRID
    await sendEmail({
      to: customerEmail,
      subject: type === 'reminder'
        ? `Reminder: Your Quote #${typedQuote.quote_number} is Expiring Soon`
        : `Your Quote #${typedQuote.quote_number} from NUBAMBU`,
      html: htmlContent,
      attachments: pdfBuffer ? [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Quote-${typedQuote.quote_number}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        }
      ] : []
    });

    // 6. UPDATE TRACKING (Using Admin Client)
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

    // 7. LOG COMMUNICATION
    await supabaseAdmin
      .from('quote_communications')
      .insert({
        quote_id: quoteId,
        contact_type: 'email',
        message_type: type,
        status: 'sent',
        sent_to: customerEmail,
      })

    return NextResponse.json({
      ok: true,
      message: `Quote ${type === 'reminder' ? 'reminder' : ''} sent successfully to ${customerEmail}`
    })

  } catch (error: any) {
    console.error('Send Quote Error:', error)
    return NextResponse.json({
      error: 'Failed to send email',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
