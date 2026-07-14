import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/unsubscribe'
import { setUnsubscribed } from '@/lib/newsletter'

// One-click unsubscribe for the newsletter. Reuses the HMAC token system.
async function handle(token: string | null) {
  if (!token) return NextResponse.redirect('https://numatbamboo.com/unsubscribe/error')
  const result = verifyToken(token)
  if (!result.valid) {
    return NextResponse.redirect('https://numatbamboo.com/unsubscribe/error')
  }
  try {
    await setUnsubscribed(result.email)
  } catch {
    return NextResponse.redirect('https://numatbamboo.com/unsubscribe/error')
  }
  return NextResponse.redirect('https://numatbamboo.com/unsubscribe/confirmed')
}

export async function GET(req: NextRequest) {
  return handle(new URL(req.url).searchParams.get('token'))
}

// RFC 8058 one-click POST.
export async function POST(req: NextRequest) {
  return handle(new URL(req.url).searchParams.get('token'))
}
