// app/api/inquiries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // For authenticated Admin checks
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js' // For public submission bypass
import { detectSpam, sanitizeInput, validateSubmissionPattern } from '@/lib/spam-detection'

// --- Rate Limiting Setup ---
const rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map()
const RATE_LIMIT = 5
const RATE_LIMIT_WINDOW = 60000 // 1 minute

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

// --- Helper: Admin Auth Check (Keep using standard client) ---
async function checkAdminAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return false
  return true
}

// ==============================================================================
// POST: Public Submit Inquiry (USES SERVICE ROLE BYPASS)
// ==============================================================================
export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limit Check
    if (!checkRateLimit(request)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { name, email, phone, company, subject, message, submissionTime } = body

    // 2. Input Validation
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!email || !validateEmail(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    if (!subject?.trim()) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    if (!message || message.trim().length < 10) return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })

    // 3. Pattern Validation
    const patternValidation = validateSubmissionPattern({ name, email, message })
    if (!patternValidation.isValid) {
      console.warn('[Anti-Spam] Pattern validation failed:', patternValidation.errors)
      return NextResponse.json({ error: 'Invalid submission format' }, { status: 400 })
    }

    // 4. Spam Detection
    const spamResult = detectSpam({ name, email, phone, message, subject })
    if (spamResult.isLikelySpam) {
      console.warn('[Anti-Spam] Spam detected', { email, score: spamResult.score })
      // Silent fail: Return success to bot, but don't save (or save as spam)
      // Here we just return error to stop processing
      return NextResponse.json({ error: 'Submission could not be processed.' }, { status: 400 })
    }

    // 5. Honeypot/Timing Check
    if (submissionTime && submissionTime < 2000) {
      console.warn('[Anti-Spam] Suspicious timing', { submissionTime })
    }

    // 6. Initialize Supabase Admin Client (Bypasses RLS)
    // We check if the key exists to prevent crashes
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

    // 7. Insert Data using Admin Client
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
// GET: Admin Fetch Inquiries (Uses Standard Auth Client)
// ==============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() // Standard client checks cookies
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
// PATCH: Admin Update Status (Uses Standard Auth Client)
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
// DELETE: Admin Delete Inquiry (Uses Standard Auth Client)
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