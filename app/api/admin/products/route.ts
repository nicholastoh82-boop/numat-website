import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdminAuth(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (adminError) {
    return { error: adminError.message, status: 500 }
  }

  if (!adminProfile) {
    return { error: 'Forbidden', status: 403 }
  }

  return { user, adminProfile }
}

function parseUsdPrice(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return NaN

  return num
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    )
  }

  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data: products, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(products ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    )
  }

  const body = await request.json()

  const {
    sku,
    title,
    description,
    image,
    is_active,
    category_id,
    length_mm,
    width_mm,
    thickness_mm,
    ply,
    moq,
    is_featured,
  } = body

  if (!sku || !title) {
    return NextResponse.json(
      { error: 'Missing required fields (sku, title)' },
      { status: 400 }
    )
  }

  const parsedPrice = parseUsdPrice(body.price)

  if (Number.isNaN(parsedPrice)) {
    return NextResponse.json(
      { error: 'Price must be a valid non-negative USD amount' },
      { status: 400 }
    )
  }

  const payload = {
    sku,
    name: title,
    slug: body.slug || sku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: description || '',
    image: image || null,
    image_url: image || null,
    category_id: category_id || null,
    length_mm:
      length_mm === '' || length_mm === undefined || length_mm === null
        ? null
        : Number(length_mm),
    width_mm:
      width_mm === '' || width_mm === undefined || width_mm === null
        ? null
        : Number(width_mm),
    thickness_mm:
      thickness_mm === '' || thickness_mm === undefined || thickness_mm === null
        ? null
        : Number(thickness_mm),
    ply: ply || null,
    moq: moq === '' || moq === undefined || moq === null ? null : Number(moq),
    is_featured: is_featured === true,
    is_active: is_active !== false,

    // Canonical stored price: base USD
    price: parsedPrice,
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Product Creation Error:', error)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 }
    )
  }

  return NextResponse.json(product, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    )
  }

  const body = await request.json()
  const {
    id,
    title,
    image,
    description,
    is_active,
    category_id,
    length_mm,
    width_mm,
    thickness_mm,
    ply,
    moq,
    is_featured,
  } = body

  if (!id) {
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400 }
    )
  }

  const updateData: Record<string, any> = {}

  if (title !== undefined) {
    updateData.name = title
  }

  if (description !== undefined) {
    updateData.description = description
  }

  if (image !== undefined) {
    updateData.image = image || null
    updateData.image_url = image || null
  }

  if (is_active !== undefined) {
    updateData.is_active = is_active
  }

  if (category_id !== undefined) {
    updateData.category_id = category_id || null
  }

  if (length_mm !== undefined) {
    updateData.length_mm = length_mm === '' || length_mm === null ? null : Number(length_mm)
  }

  if (width_mm !== undefined) {
    updateData.width_mm = width_mm === '' || width_mm === null ? null : Number(width_mm)
  }

  if (thickness_mm !== undefined) {
    updateData.thickness_mm =
      thickness_mm === '' || thickness_mm === null
        ? null
        : Number(thickness_mm)
  }

  if (ply !== undefined) {
    updateData.ply = ply || null
  }

  if (moq !== undefined) {
    updateData.moq = moq === '' || moq === null ? null : Number(moq)
  }

  if (is_featured !== undefined) {
    updateData.is_featured = is_featured
  }

  if (body.price !== undefined) {
    const parsedPrice = parseUsdPrice(body.price)

    if (Number.isNaN(parsedPrice)) {
      return NextResponse.json(
        { error: 'Price must be a valid non-negative USD amount' },
        { status: 400 }
      )
    }

    // Canonical stored price: base USD
    updateData.price = parsedPrice
  }

  const { data: product, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(product)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    )
  }

  const { error } = await supabase
    .from('products')
    .update({
      is_active: false,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}