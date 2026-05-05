import { updateSession } from '@/lib/supabase/proxy'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// In memory IP rate limiter. Best effort across edge worker instances.
// For strict cross instance limits, swap the ipMap for an Upstash Redis backed store.
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

// Routes that require an authenticated session.
// Defence in depth on top of the client side or layout based checks.
const AUTH_GATED_PREFIXES = ['/admin', '/portal']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limiting on POST to form and AI endpoints.
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

  // Edge gate for protected sections: server side redirect to login if no session.
  if (AUTH_GATED_PREFIXES.some((p) => pathname.startsWith(p))) {
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
      // /admin sends to /auth/login (existing pattern).
      // /portal sends to /crm/login (matches the rest of the operator app).
      const loginPath = pathname.startsWith('/portal') ? '/crm/login' : '/auth/login'
      const loginUrl = new URL(loginPath, request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images: .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
