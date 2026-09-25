// app/api/admin/upload-url/route.ts
//
// Issues a one time signed upload URL for the Supabase storage bucket
// "products", so the admin screens can upload images straight from the
// browser to Supabase. Files never pass through this Vercel function, so the
// 4.5 MB request limit on Vercel functions no longer applies (that limit is
// what caused "Request Entity Too Large" on blog image uploads).
//
// Admin only: same check as /api/admin/upload.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const BUCKET = 'products'
const ALLOWED = /^image\/(jpeg|png|webp|gif|avif|svg\+xml)$/

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('admin_profiles').select('role').eq('id', user.id).single()
    if (!adminProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { contentType, fileName } = (await request.json()) as { contentType?: string; fileName?: string }
    if (!contentType || !ALLOWED.test(contentType)) {
      return NextResponse.json({ error: 'Only image files can be uploaded here.' }, { status: 400 })
    }

    const ext =
      contentType === 'image/svg+xml'
        ? 'svg'
        : contentType.split('/')[1] === 'jpeg'
          ? 'jpg'
          : contentType.split('/')[1]
    const base = (fileName ?? 'image')
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'image'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${base}.${ext}`

    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(path)
    if (error || !data) {
      console.error('[upload-url] createSignedUploadUrl failed', error)
      return NextResponse.json({ error: 'Could not prepare the upload. Please try again.' }, { status: 500 })
    }

    const publicUrl = service.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    return NextResponse.json({ bucket: BUCKET, path: data.path, token: data.token, publicUrl })
  } catch (err) {
    console.error('[upload-url] failed', err)
    return NextResponse.json({ error: 'Could not prepare the upload. Please try again.' }, { status: 500 })
  }
}
