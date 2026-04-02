import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

async function checkAdminAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminProfile) return { error: 'Forbidden', status: 403 }
  return { user }
}

// GET /api/admin/variant-images?variantId=xxx
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const auth = await checkAdminAuth(supabase)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const variantId = request.nextUrl.searchParams.get('variantId')
  if (!variantId) return NextResponse.json({ error: 'variantId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('variant_id', variantId)
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ images: data ?? [] })
}

// POST /api/admin/variant-images — multipart form: variantId, productId, images[]
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const auth = await checkAdminAuth(supabase)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const formData = await request.formData()
  const variantId = formData.get('variantId') as string
  const productId = formData.get('productId') as string
  const files = formData.getAll('images') as File[]

  if (!variantId || !productId) {
    return NextResponse.json({ error: 'variantId and productId required' }, { status: 400 })
  }
  if (files.length === 0) {
    return NextResponse.json({ error: 'No images provided' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('product_images')
    .select('display_order')
    .eq('variant_id', variantId)
    .order('display_order', { ascending: false })
    .limit(1)

  let nextOrder = existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0

  const uploaded = []
  for (const file of files) {
    const fileName = `variants/${variantId}/${uuidv4()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('product_images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (uploadError) continue

    const { data: urlData } = supabase.storage.from('product_images').getPublicUrl(fileName)

    const { data: record } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        variant_id: variantId,
        image_url: urlData.publicUrl,
        alt_text: file.name.replace(/\.[^/.]+$/, ''),
        display_order: nextOrder++,
      })
      .select()
      .single()

    if (record) uploaded.push(record)
  }

  return NextResponse.json({ images: uploaded })
}

// DELETE /api/admin/variant-images?imageId=xxx
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const auth = await checkAdminAuth(supabase)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const imageId = request.nextUrl.searchParams.get('imageId')
  if (!imageId) return NextResponse.json({ error: 'imageId required' }, { status: 400 })

  const { data: image } = await supabase
    .from('product_images')
    .select('image_url')
    .eq('id', imageId)
    .single()

  if (image) {
    const bucketStr = '/storage/v1/object/public/product_images/'
    const parts = image.image_url.split(bucketStr)
    if (parts.length === 2) {
      await supabase.storage.from('product_images').remove([parts[1]])
    }
  }

  const { error } = await supabase.from('product_images').delete().eq('id', imageId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
