import { updateSession } from '@/lib/supabase/proxy'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10
const ipMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipMap.get(ip)
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

const RATE_LIMITED_ROUTES = [
  '/api/contact',
  '/api/chat',
  '/api/quote',
  '/api/nara',
  '/api/exchange-rate',
  '/api/request-quote',
]

const AUTH_GATED_PREFIXES = ['/admin', '/portal']

// Paths under /portal that should NOT trigger an auth redirect
// (the login page itself, and access denied which handles its own rendering).
const PORTAL_PUBLIC_PATHS = ['/portal/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    request.method === 'POST' &&
    RATE_LIMITED_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please wait a moment and try again.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(
              Math.ceil((Date.now() + RATE_LIMIT_WINDOW_MS) / 1000),
            ),
          },
        },
      )
    }
  }

  // Skip auth gate for public portal paths (login, etc.)
  const isPortalPublic = PORTAL_PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (
    !isPortalPublic &&
    AUTH_GATED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    const res = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options),
            )
          },
        },
      },
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Portal users go to the dedicated portal login.
      // Admin users continue to the existing /auth/login.
      const loginPath = pathname.startsWith('/portal') ? '/portal/login' : '/auth/login'
      const loginUrl = new URL(loginPath, request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
