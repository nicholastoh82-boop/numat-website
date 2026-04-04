// app/api/inquiries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { detectSpam, sanitizeInput, validateSubmissionPattern } from '@/lib/spam-detection'

// --- Rate Limiting Setup ---
const rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map()
const RATE_LIMIT = 5
const RATE_LIMIT_WINDOW = 60000

function checkRateLimit(request: NextRequest): boolean {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'
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

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function checkAdminAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return false
  return true
}

function generateInquiryNotificationHTML(data: {
  name: string
  email: string
  phone?: string | null
  company?: string | null
  subject: string
  message: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Inquiry - NUMAT</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#ffffff;padding:24px 32px;border-bottom:3px solid #1a237e;">
              <img src="https://numatbamboo.com/numat-logo.png" alt="NUMAT" width="160" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:${data.subject === 'Sample Request' ? '#2e7d32' : '#4caf50'};padding:14px 32px;">
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;">${data.subject === 'Sample Request' ? '📦 New Sample Request' : '📬 New Contact Form Inquiry'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border-left:4px solid #1a237e;border-radius:4px;margin-bottom:20px;">
                <tr><td style="padding:14px 16px;">
                  <p style="margin:0;font-size:13px;color:#333;"><strong>Name:</strong> ${data.name}</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#333;"><strong>Email:</strong> <a href="mailto:${data.email}" style="color:#1a237e;">${data.email}</a></p>
                  ${data.phone ? `<p style="margin:6px 0 0;font-size:13px;color:#333;"><strong>Phone:</strong> ${data.phone}</p>` : ''}
                  ${data.company ? `<p style="margin:6px 0 0;font-size:13px;color:#333;"><strong>Company:</strong> ${data.company}</p>` : ''}
                  <p style="margin:6px 0 0;font-size:13px;color:#333;"><strong>Subject:</strong> ${data.subject}</p>
                </td></tr>
              </table>
              <p style="margin:0;font-size:13px;color:#555;font-weight:600;">Message:</p>
              <p style="margin:8px 0 0;font-size:14px;color:#333;line-height:1.7;background:#f9f9f9;padding:14px;border-radius:4px;border:1px solid #e0e0e0;">${data.message.replace(/\n/g, '<br>')}</p>
              <div style="text-align:center;margin-top:28px;">
                <a href="mailto:${data.email}?subject=Re: ${data.subject}"
                  style="display:inline-block;background-color:#1a237e;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
                  Reply to ${data.name}
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1a237e;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9fa8da;">NUMAT — sales@numat.ph | numatbamboo.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ==============================================================================
// POST: Public Submit Inquiry
// ==============================================================================
export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(request)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { name, email, phone, company, subject, message, submissionTime } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!email || !validateEmail(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    if (!subject?.trim()) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    if (!message || message.trim().length < 10) return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })

    const patternValidation = validateSubmissionPattern({ name, email, message })
    if (!patternValidation.isValid) {
      console.warn('[Anti-Spam] Pattern validation failed:', patternValidation.errors)
      return NextResponse.json({ error: 'Invalid submission format' }, { status: 400 })
    }

    const spamResult = detectSpam({ name, email, phone, message, subject })
    if (spamResult.isLikelySpam) {
      console.warn('[Anti-Spam] Spam detected', { email, score: spamResult.score })
      return NextResponse.json({ error: 'Submission could not be processed.' }, { status: 400 })
    }

    if (submissionTime && submissionTime < 2000) {
      console.warn('[Anti-Spam] Suspicious timing', { submissionTime })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase Service Role Key')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: inquiry, error } = await supabaseAdmin
      .from('inquiries')
      .insert({
        name: sanitizeInput(name.trim()),
        email: sanitizeInput(email.trim().toLowerCase()),
        phone: phone ? sanitizeInput(phone.trim()) : null,
        company: company ? sanitizeInput(company.trim()) : null,
        subject: sanitizeInput(subject.trim()),
        message: sanitizeInput(message.trim()),
        status: 'new',
        spam_score: spamResult.score,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Inquiry Insert Error:', error)
      return NextResponse.json({ error: 'Failed to submit inquiry.' }, { status: 500 })
    }

    // Send webhook to n8n
    try {
      await fetch('https://nicholastoh.app.n8n.cloud/webhook/numat-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: inquiry.id,
          name: sanitizeInput(name.trim()),
          email: email.trim().toLowerCase(),
          phone: phone ? sanitizeInput(phone.trim()) : null,
          company: company ? sanitizeInput(company.trim()) : null,
          subject: sanitizeInput(subject.trim()),
          message: sanitizeInput(message.trim()),
          source: 'contact_form',
        }),
      })
    } catch (webhookError) {
      console.error('[n8n Webhook] Failed:', webhookError)
    }

    // Send email notification via Resend
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: ['sales@numat.ph', 'mohan@numat.ph', 'nick@numat.ph'],
          reply_to: email.trim().toLowerCase(),
          subject: `New Inquiry: ${subject} — ${name}`,
          html: generateInquiryNotificationHTML({
            name: sanitizeInput(name.trim()),
            email: email.trim().toLowerCase(),
            phone: phone ? sanitizeInput(phone.trim()) : null,
            company: company ? sanitizeInput(company.trim()) : null,
            subject: sanitizeInput(subject.trim()),
            message: sanitizeInput(message.trim()),
          }),
        }),
      })
      const emailData = await emailRes.json()
      console.log('[Inquiry Email] Status:', emailRes.status, JSON.stringify(emailData))
    } catch (emailError) {
      console.error('[Inquiry Email] Failed:', emailError)
    }

    return NextResponse.json({
      ok: true,
      id: inquiry.id,
      message: 'Thank you! We will respond within 24-48 hours.',
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ==============================================================================
// GET: Admin Fetch Inquiries
// ==============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!(await checkAdminAuth(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase.from('inquiries').select('*').order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// ==============================================================================
// PATCH: Admin Update Status
// ==============================================================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!(await checkAdminAuth(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, status } = await request.json()
    const { error } = await supabase.from('inquiries').update({ status }).eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// ==============================================================================
// DELETE: Admin Delete Inquiry
// ==============================================================================
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!(await checkAdminAuth(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { error } = await supabase.from('inquiries').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}