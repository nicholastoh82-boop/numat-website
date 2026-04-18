// ============================================================================
// File path in your repo: app/api/admin/product-variants/route.ts
//
// Rewritten after the catalog cleanup. Key changes:
//   - Removed writes to dropped columns: currency, unit_price_old.
//   - Added writes for new columns: in_stock, image_url, ply_count,
//     size_label, sort_order, applications.
//   - Auto-generates size_label from length_mm x width_mm x thickness_mm
//     if the client does not explicitly provide one.
//   - Still accepts id or sku as the lookup key on PATCH.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

function parseNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : NaN
}

function parseNullableInt(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? Math.round(num) : NaN
}

function parseNullableBoolean(value: unknown) {
  if (value === null || value === undefined) return undefined
  return Boolean(value)
}

function buildSizeLabel(length: number | null, width: number | null, thickness: number | null) {
  if (length && width && thickness) {
    return `${length} mm x ${width} mm x ${thickness} mm`
  }
  return null
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const includeInactive = searchParams.get('includeInactive') === 'true'

  let query = supabase
    .from('product_variants')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('thickness_mm', { ascending: true, nullsFirst: false })
    .order('sku', { ascending: true })

  if (productId) query = query.eq('product_id', productId)
  if (!includeInactive) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [], {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
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
  const { id, sku } = body

  if (!id && !sku) {
    return NextResponse.json({ error: 'Variant ID or SKU is required' }, { status: 400 })
  }

  const updateData: Record<string, any> = {}

  // Text fields
  if (body.sku !== undefined) updateData.sku = body.sku || null
  if (body.finish !== undefined) updateData.finish = body.finish || null
  if (body.grade !== undefined) updateData.grade = body.grade || null
  if (body.unit !== undefined) updateData.unit = body.unit || null
  if (body.core_type !== undefined) updateData.core_type = body.core_type || null
  if (body.price_notes !== undefined) updateData.price_notes = body.price_notes || null
  if (body.image_url !== undefined) updateData.image_url = body.image_url || null

  // Numeric dimensions
  const numericFields: Array<[string, string]> = [
    ['thickness_mm', 'thickness_mm'],
    ['length_mm', 'length_mm'],
    ['width_mm', 'width_mm'],
    ['moq', 'moq'],
    ['sort_order', 'sort_order'],
    ['ply_count', 'ply_count'],
  ]

  for (const [bodyKey, dbKey] of numericFields) {
    if (body[bodyKey] !== undefined) {
      const v = parseNullableInt(body[bodyKey])
      if (Number.isNaN(v)) {
        return NextResponse.json({ error: `${bodyKey} must be a valid integer` }, { status: 400 })
      }
      updateData[dbKey] = v
    }
  }

  // Price fields: keep unit_price and base_price_usd in sync (single source of truth USD)
  const incomingBasePrice =
    body.base_price_usd !== undefined ? body.base_price_usd : body.unit_price

  if (incomingBasePrice !== undefined) {
    const value = parseNullableNumber(incomingBasePrice)
    if (Number.isNaN(value)) {
      return NextResponse.json({ error: 'base_price_usd must be a valid number' }, { status: 400 })
    }
    updateData.base_price_usd = value
    updateData.unit_price = value
  }

  // Booleans
  if (body.is_active !== undefined) updateData.is_active = parseNullableBoolean(body.is_active)
  if (body.is_price_on_request !== undefined) {
    updateData.is_price_on_request = parseNullableBoolean(body.is_price_on_request)
  }
  if (body.in_stock !== undefined) updateData.in_stock = parseNullableBoolean(body.in_stock)

  // Applications array
  if (body.applications !== undefined) {
    updateData.applications = Array.isArray(body.applications) ? body.applications : []
  }

  // Size label: either use provided, or auto-generate from dimensions
  if (body.size_label !== undefined) {
    updateData.size_label = body.size_label || null
  } else if (
    updateData.length_mm !== undefined ||
    updateData.width_mm !== undefined ||
    updateData.thickness_mm !== undefined
  ) {
    // Fetch current variant to fill in any missing dims
    const currentRes = id
      ? await supabase.from('product_variants').select('length_mm,width_mm,thickness_mm').eq('id', id).maybeSingle()
      : await supabase.from('product_variants').select('length_mm,width_mm,thickness_mm').eq('sku', sku).maybeSingle()

    const existing = currentRes.data || {}
    const length = updateData.length_mm ?? existing.length_mm ?? null
    const width = updateData.width_mm ?? existing.width_mm ?? null
    const thickness = updateData.thickness_mm ?? existing.thickness_mm ?? null
    const auto = buildSizeLabel(length, width, thickness)
    if (auto) updateData.size_label = auto
  }

  // Perform update by id, falling back to sku
  let updatedVariant: any = null
  let updateError: any = null

  if (id) {
    const result = await supabase
      .from('product_variants')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    updatedVariant = result.data
    updateError = result.error
  }

  if (!updatedVariant && !updateError && sku) {
    const result = await supabase
      .from('product_variants')
      .update(updateData)
      .eq('sku', sku)
      .select('*')
      .maybeSingle()
    updatedVariant = result.data
    updateError = result.error
  }

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (!updatedVariant) {
    return NextResponse.json({ error: 'Variant not found by id or sku' }, { status: 404 })
  }

  return NextResponse.json(updatedVariant, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
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
  if (!body.product_id) {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
  }

  const length = parseNullableInt(body.length_mm)
  const width = parseNullableInt(body.width_mm)
  const thickness = parseNullableInt(body.thickness_mm)
  if ([length, width, thickness].some((v) => Number.isNaN(v))) {
    return NextResponse.json({ error: 'Dimensions must be integers' }, { status: 400 })
  }

  const sizeLabel = body.size_label || buildSizeLabel(length, width, thickness)
  const priceInput = body.base_price_usd !== undefined ? body.base_price_usd : body.unit_price
  const price = parseNullableNumber(priceInput)
  if (Number.isNaN(price)) {
    return NextResponse.json({ error: 'base_price_usd must be a valid number' }, { status: 400 })
  }

  const payload: any = {
    product_id: body.product_id,
    sku: body.sku || null,
    size_label: sizeLabel,
    length_mm: length,
    width_mm: width,
    thickness_mm: thickness,
    ply_count: parseNullableInt(body.ply_count) ?? null,
    finish: body.finish || null,
    grade: body.grade || null,
    core_type: body.core_type || null,
    unit: body.unit || 'piece',
    moq: parseNullableInt(body.moq) ?? null,
    sort_order: parseNullableInt(body.sort_order) ?? null,
    base_price_usd: price,
    unit_price: price,
    is_active: body.is_active !== false,
    is_price_on_request: body.is_price_on_request === true,
    in_stock: body.in_stock !== false,
    price_notes: body.price_notes || null,
    image_url: body.image_url || null,
    applications: Array.isArray(body.applications) ? body.applications : [],
  }

  const { data, error } = await supabase
    .from('product_variants')
    .insert(payload)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}