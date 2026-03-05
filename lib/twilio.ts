import twilio from 'twilio'

/* ---------------------------------------------------
   Types
--------------------------------------------------- */

interface WhatsAppProductionOptions {
  to: string
  customerName: string
  quoteNumber: string
  total: string
  quoteUrl: string
  type: 'send' | 'reminder'
  validUntil?: string
}

interface WhatsAppMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

/* ---------------------------------------------------
   Internal helper – create Twilio client safely
--------------------------------------------------- */

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are missing on the server')
  }

  return twilio(accountSid, authToken)
}

/* ---------------------------------------------------
   Send WhatsApp Production Message (Template Based)
--------------------------------------------------- */

export async function sendWhatsAppProductionQuote(
  options: WhatsAppProductionOptions
): Promise<WhatsAppMessageResponse> {
  try {
    const rawWhatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim()

    // Choose the correct Template SID based on type
    const contentSid = options.type === 'send'
      ? process.env.TWILIO_QUOTE_TEMPLATE_SID?.trim()
      : process.env.TWILIO_REMINDER_TEMPLATE_SID?.trim()

    if (!rawWhatsappFrom || !contentSid) {
      return {
        success: false,
        error: 'Twilio Production environment variables (FROM or TEMPLATE_SID) are not configured',
      }
    }

    const client = getTwilioClient()

    // Ensure prefixes
    const from = rawWhatsappFrom.startsWith('whatsapp:')
      ? rawWhatsappFrom
      : `whatsapp:${rawWhatsappFrom}`

    const to = options.to.trim().startsWith('whatsapp:')
      ? options.to.trim()
      : `whatsapp:${options.to.trim()}`

    // Construct Variables mapping based on Template structure
    // {{1}} = Name, {{2}} = Quote Number, {{3}} = Total/Date, {{4}} = URL
    const variables: Record<string, string> = options.type === 'send'
      ? {
        "1": options.customerName,
        "2": options.quoteNumber,
        "3": options.total,
        "4": options.quoteUrl
      }
      : {
        "1": options.customerName,
        "2": options.quoteNumber,
        "3": options.validUntil || 'soon',
        "4": options.quoteUrl
      }

    const message = await client.messages.create({
      from,
      to,
      contentSid,
      contentVariables: JSON.stringify(variables)
    })

    console.log(`[Twilio Production] ${options.type} sent:`, message.sid)

    return {
      success: true,
      messageId: message.sid,
    }
  } catch (error: any) {
    console.error('[Twilio Production Error]:', error)
    return {
      success: false,
      error: error?.message || 'Unknown Twilio Production error',
    }
  }
}

/* ---------------------------------------------------
   Phone utilities
--------------------------------------------------- */

export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, '')
  return /^\+?[1-9]\d{7,14}$/.test(cleaned)
}

export function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/\s+/g, '')
  if (!formatted.startsWith('+')) {
    formatted = `+${formatted}`
  }
  return formatted
}