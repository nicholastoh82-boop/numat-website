import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertInboundLead } from '@/lib/leads/inbound'

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
      return await handleIncomingMessage(data as TwilioWebhookPayload)
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
    const status = mapTwilioStatus(MessageStatus || '')

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
 * Handle incoming WhatsApp messages: turn each inbound message into a tracked
 * CRM lead in master_leads (deduped by phone) with an owner, and log the message
 * as an activity. Previously this wrote to customers and incoming_messages tables
 * that do not exist, so inbound WhatsApp was silently lost.
 */
async function handleIncomingMessage(data: TwilioWebhookPayload) {
  const { From, To, Body, MessageSid, NumMedia } = data
  const phoneNumber = From.replace('whatsapp:', '')

  console.log(`[Webhook] Incoming WhatsApp from ${phoneNumber}:`, Body || `[Media x${NumMedia}]`)

  try {
    await upsertInboundLead({
      phone: phoneNumber,
      sourceType: 'inbound_whatsapp',
      leadSource: 'Inbound WhatsApp',
      contactChannel: 'whatsapp',
      notes: Body ? String(Body).slice(0, 800) : null,
      sourcePayload: {
        message_sid: MessageSid,
        from: phoneNumber,
        to: To.replace('whatsapp:', ''),
        body: Body ? String(Body).slice(0, 1000) : null,
        media_count: Number(NumMedia) || 0,
      },
    })

    return NextResponse.json({ success: true, message: 'Incoming message recorded as a lead' })
  } catch (error) {
    console.error('[Webhook] Error recording incoming WhatsApp:', error)
    // Always return 200 so Twilio does not retry.
    return NextResponse.json({ success: true })
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
