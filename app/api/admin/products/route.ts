import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdminAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile) return { error: 'Forbidden', status: 403 }
  return { user, adminProfile }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
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

  return NextResponse.json(products)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
  }

  const body = await request.json()

  const {
    sku,
    title,
    size,
    thickness_mm,
    ply,
    price,
    base_price,
    moq,
    lead_time_days,
    category,
    category_id,
    description,
    image, // This is the URL string from the frontend
    is_active,
    is_featured,
    specifications
  } = body

  if (!sku || !title || !price) {
    return NextResponse.json({ error: 'Missing required fields (sku, title, price)' }, { status: 400 })
  }

  // NOTE: We map 'image' from the body to the 'image' column in the DB.
  // We also map 'title' to 'name' in case your schema requires 'name'.
  // If you get an error about 'name' column missing, remove the "name: title," line.

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      sku,
      title,
      name: title, // Keep this if your table has a 'name' column. If not, remove it.
      slug: body.slug || sku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      size,
      thickness_mm: thickness_mm ? parseFloat(thickness_mm) : null,
      ply,
      price: parseFloat(price),
      base_price: base_price ? parseFloat(base_price) : parseFloat(price),
      moq: moq || 10,
      lead_time_days: lead_time_days || 10,
      category: category || 'General',
      category_id: category_id || null,
      description,
      image: image, // FIXED: Changed from 'image_url' to 'image' to match your DB column
      is_active: is_active !== false,
      is_featured: is_featured || false,
      specifications
    })
    .select()
    .single()

  if (error) {
    console.error('Product Creation Error:', error)
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  return NextResponse.json(product, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
  }

  const body = await request.json()
  const { id, image, ...updates } = body // Destructure image specifically

  if (!id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  // Build the update object
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  // If image is being updated, map it to the correct column name
  if (image) {
    updateData.image = image
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
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
  }

  const { error } = await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}