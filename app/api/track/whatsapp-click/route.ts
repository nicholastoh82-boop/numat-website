import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Records an anonymous WhatsApp link click (top of funnel volume, by page).
// Public and best effort: it never blocks and never returns an error to the
// beacon. No personal data is stored, only the page and the link.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const path = typeof body?.path === 'string' ? body.path.slice(0, 300) : null
    const href = typeof body?.href === 'string' ? body.href.slice(0, 500) : null

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await admin.from('whatsapp_clicks').insert({
      path,
      href,
      referrer: request.headers.get('referer')?.slice(0, 500) || null,
      user_agent: request.headers.get('user-agent')?.slice(0, 300) || null,
    })
  } catch {
    // swallow: tracking must never surface an error
  }
  return new NextResponse(null, { status: 204 })
}
