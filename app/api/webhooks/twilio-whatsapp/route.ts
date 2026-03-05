import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Webhook Handler for Twilio WhatsApp Events
 * 
 * This endpoint handles:
 * 1. Message Status Callbacks (delivered, read, failed)
 * 2. Incoming Messages
 * 3. Media Messages
 */

interface TwilioWebhookPayload {
  MessageSid: string
  AccountSid: string
  From: string
  To: string
  Body?: string
  NumMedia?: string
  MediaUrl0?: string
  MessageStatus?: string
  ErrorCode?: string
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await request.formData()
    const data: Record<string, any> = {}

    formData.forEach((value, key) => {
      data[key] = value
    })

    console.log('[Webhook] Received Twilio WhatsApp event:', {
      messageSid: data.MessageSid,
      from: data.From,
      to: data.To,
      status: data.MessageStatus,
    })

    const supabase = await createClient()

    // Handle message status callback
    if (data.MessageStatus) {
      return await handleStatusCallback(data as TwilioWebhookPayload, supabase)
    }

    // Handle incoming message
    if (data.Body || data.NumMedia) {
      return await handleIncomingMessage(data as TwilioWebhookPayload, supabase)
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    })
  } catch (error) {
    console.error('[Webhook] Error processing Twilio event:', error)
    // Always return 200 to prevent Twilio from retrying
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Handle message status callbacks from Twilio
 */
async function handleStatusCallback(
  data: TwilioWebhookPayload,
  supabase: any
) {
  const { MessageSid, MessageStatus, From, To, ErrorCode } = data

  console.log(`[Webhook] Processing status callback for message ${MessageSid}: ${MessageStatus}`)

  try {
    // Find the communication record
    const { data: communications, error: queryError } = await supabase
      .from('quote_communications')
      .select('id, quote_id')
      .eq('message_id', MessageSid)
      .single()

    if (queryError) {
      console.warn(`[Webhook] Could not find communication with message ID ${MessageSid}`)
      return NextResponse.json({ success: true })
    }

    // Map Twilio status to our status
    const status = mapTwilioStatus(MessageStatus)

    // Update communication record
    const { error: updateError } = await supabase
      .from('quote_communications')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(ErrorCode && { error_code: ErrorCode }),
      })
      .eq('id', communications.id)

    if (updateError) {
      console.error('[Webhook] Error updating communication:', updateError)
      return NextResponse.json({ success: true })
    }

    // If message was delivered, optionally update quote metadata
    if (status === 'delivered' && communications.quote_id) {
      await supabase
        .from('quotes')
        .update({
          last_contact_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', communications.quote_id)
    }

    console.log(`[Webhook] Updated communication status to: ${status}`)

    return NextResponse.json({
      success: true,
      status: MessageStatus,
    })
  } catch (error) {
    console.error('[Webhook] Error in handleStatusCallback:', error)
    return NextResponse.json({ success: true })
  }
}

/**
 * Handle incoming WhatsApp messages
 */
async function handleIncomingMessage(
  data: TwilioWebhookPayload,
  supabase: any
) {
  const { From, To, Body, MessageSid, NumMedia } = data

  console.log(`[Webhook] Received incoming message from ${From}:`, Body || `[Media x${NumMedia}]`)

  try {
    // Extract phone number (WhatsApp format: whatsapp:+1234567890)
    const phoneNumber = From.replace('whatsapp:', '')

    // Find customer by phone number
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('phone', phoneNumber)
      .single()

    if (customerError) {
      console.warn(`[Webhook] Could not find customer with phone ${phoneNumber}`)
      // Still store the message for reference
      await storeIncomingMessage(data, supabase, null)
      return NextResponse.json({ success: true })
    }

    // Store incoming message
    await storeIncomingMessage(data, supabase, customer?.id)

    // Optional: Auto-respond or log for manual follow-up
    console.log(`[Webhook] Stored incoming message from ${customer.name}`)

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      message: 'Incoming message processed',
    })
  } catch (error) {
    console.error('[Webhook] Error in handleIncomingMessage:', error)
    return NextResponse.json({ success: true })
  }
}

/**
 * Store incoming message in database
 */
async function storeIncomingMessage(
  data: TwilioWebhookPayload,
  supabase: any,
  customerId?: string
) {
  const { From, To, Body, MessageSid, NumMedia } = data

  try {
    const { error } = await supabase
      .from('incoming_messages')
      .insert({
        message_id: MessageSid,
        from_phone: From.replace('whatsapp:', ''),
        to_phone: To.replace('whatsapp:', ''),
        body: Body || null,
        has_media: NumMedia > 0,
        media_count: NumMedia || 0,
        customer_id: customerId,
        platform: 'whatsapp',
        raw_data: data,
        received_at: new Date().toISOString(),
      })

    if (error) {
      console.error('[Webhook] Error storing incoming message:', error)
    }
  } catch (error) {
    console.error('[Webhook] Exception storing incoming message:', error)
  }
}

/**
 * Map Twilio message status to application status
 */
function mapTwilioStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    'queued': 'queued',
    'sending': 'sending',
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed',
    'undelivered': 'failed',
  }

  return statusMap[twilioStatus] || twilioStatus
}

/**
 * Verify Twilio Request Signature (Security)
 * 
 * To enable signature verification:
 * 1. Get your Auth Token from Twilio Console
 * 2. Use: verifyTwilioSignature(request, authToken)
 */
export async function verifyTwilioSignature(
  request: NextRequest,
  authToken: string
): Promise<boolean> {
  const crypto = require('crypto')

  const url = request.url
  const body = await request.text()
  const signature = request.headers.get('X-Twilio-Signature') || ''

  const hash = crypto
    .createHmac('sha1', authToken)
    .update(url + body)
    .digest('Base64')

  return hash === signature
}
