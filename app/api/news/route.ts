import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json([], { status: 200 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from('news')
      .select('id, title, slug, excerpt, cover_image_url, published_at, featured')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(3)

    if (error) {
      console.error('News API error:', error)
      return NextResponse.json([], { status: 200 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('News API error:', err)
    return NextResponse.json([], { status: 200 })
  }
}