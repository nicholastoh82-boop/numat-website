import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      // Store user info in cookie
      const cookieStore = await cookies()
      const userInfo = JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
      })
      cookieStore.set('user_session', userInfo, {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
