// ============================================================================
// File path in your repo: app/api/admin/products/route.ts
//
// Rewritten after the catalog cleanup. Key changes:
//   - Writes only fields that still exist in the DB:
//       name, slug, description, image_url, base_price_usd, moq,
//       moq_unit, order_increment, unit, category_id, is_active,
//       is_featured, is_price_on_request, price_notes
//   - Removed writes to dropped columns: length_mm, width_mm, thickness_mm,
//     ply, category, min_order_qty, currency, unit_price, image.
//   - Accepts either "name" or the legacy "title" for compatibility.
//   - Accepts either "image_url" or legacy "image".
//   - Accepts either "base_price_usd" or legacy "price".
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdminAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: adminProfile, error: adminError } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (adminError) return { error: adminError.message, status: 500 }
  if (!adminProfile) return { error: 'Forbidden', status: 403 }

  return { user, adminProfile }
}

function parseUsdPrice(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return NaN
  return num
}

function parseNullableInt(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? Math.round(num) : NaN
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
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
    .select('*, categories(id, name)')
    .order('created_at', { ascending: false })

  if (!includeInactive) query = query.eq('is_active', true)

  const { data: products, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(products ?? [])
}

// ---------------------------------------------------------------------------
// POST (create)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
  }

  const body = await request.json()

  // Accept both new and legacy field names for backward compat
  const name = body.name ?? body.title
  const imageUrl = body.image_url ?? body.image ?? null
  const priceInput = body.base_price_usd ?? body.price

  if (!name) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
  }

  const parsedPrice = parseUsdPrice(priceInput)
  if (Number.isNaN(parsedPrice)) {
    return NextResponse.json(
      { error: 'base_price_usd must be a valid non-negative amount' },
      { status: 400 },
    )
  }

  const parsedMoq = parseNullableInt(body.moq)
  const parsedIncrement = parseNullableInt(body.order_increment)
  if (Number.isNaN(parsedMoq) || Number.isNaN(parsedIncrement)) {
    return NextResponse.json({ error: 'moq and order_increment must be integers' }, { status: 400 })
  }

  const slug = body.slug || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const payload: any = {
    name,
    slug,
    description: body.description ?? '',
    image_url: imageUrl,
    base_price_usd: parsedPrice,
    moq: parsedMoq ?? 1,
    moq_unit: body.moq_unit ?? 'piece',
    order_increment: parsedIncrement ?? 1,
    unit: body.unit ?? 'piece',
    category_id: body.category_id || null,
    is_active: body.is_active !== false,
    is_featured: body.is_featured === true,
    is_price_on_request: body.is_price_on_request === true,
    price_notes: body.price_notes ?? null,
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*, categories(id, name)')
    .single()

  if (error) {
    console.error('Product Creation Error:', error)
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  return NextResponse.json(product, { status: 201 })
}

// ---------------------------------------------------------------------------
// PATCH (update)
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
  }

  const body = await request.json()
  if (!body.id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  // Accept legacy aliases
  const name = body.name ?? body.title
  const imageUrl = body.image_url ?? body.image
  const priceInput = body.base_price_usd !== undefined ? body.base_price_usd : body.price

  const updateData: Record<string, any> = {}

  if (name !== undefined) updateData.name = name
  if (body.slug !== undefined) updateData.slug = body.slug
  if (body.description !== undefined) updateData.description = body.description
  if (imageUrl !== undefined) updateData.image_url = imageUrl || null
  if (body.category_id !== undefined) updateData.category_id = body.category_id || null
  if (body.is_active !== undefined) updateData.is_active = body.is_active
  if (body.is_featured !== undefined) updateData.is_featured = body.is_featured
  if (body.is_price_on_request !== undefined) updateData.is_price_on_request = body.is_price_on_request
  if (body.price_notes !== undefined) updateData.price_notes = body.price_notes || null
  if (body.moq_unit !== undefined) updateData.moq_unit = body.moq_unit
  if (body.unit !== undefined) updateData.unit = body.unit

  if (body.moq !== undefined) {
    const n = parseNullableInt(body.moq)
    if (Number.isNaN(n)) return NextResponse.json({ error: 'moq must be an integer' }, { status: 400 })
    updateData.moq = n
  }

  if (body.order_increment !== undefined) {
    const n = parseNullableInt(body.order_increment)
    if (Number.isNaN(n)) {
      return NextResponse.json({ error: 'order_increment must be an integer' }, { status: 400 })
    }
    updateData.order_increment = n
  }

  if (priceInput !== undefined) {
    const parsedPrice = parseUsdPrice(priceInput)
    if (Number.isNaN(parsedPrice)) {
      return NextResponse.json(
        { error: 'base_price_usd must be a valid non-negative amount' },
        { status: 400 },
      )
    }
    updateData.base_price_usd = parsedPrice
  }

  const { data: product, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', body.id)
    .select('*, categories(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(product)
}

// ---------------------------------------------------------------------------
// DELETE (soft)
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })

  const supabase = await createClient()
  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
  }

  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}