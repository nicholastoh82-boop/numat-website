import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey) {
  console.warn('RESEND_API_KEY is not configured')
}

const resend = new Resend(resendApiKey)

// Internal recipients always CC'd on every quote email
const INTERNAL_CC: string[] = ['sales@numat.ph', 'mohan@numat.ph']

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    content: string
    filename: string
    type: string
    disposition: string
  }>
}

export async function sendEmail(options: SendEmailOptions) {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@numat.ph'
    const replyToEmail = process.env.RESEND_REPLY_TO || 'sales@numat.ph'

    const attachments =
      options.attachments?.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
      })) || []

    const response = await resend.emails.send({
      to: options.to,
      cc: INTERNAL_CC,
      from: fromEmail,
      subject: options.subject,
      html: options.html,
      reply_to: replyToEmail,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return {
      success: true,
      messageId: response.data?.id,
    }
  } catch (error) {
    console.error('Resend Error:', error)
    throw error
  }
}