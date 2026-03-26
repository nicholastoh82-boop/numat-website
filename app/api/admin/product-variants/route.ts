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

function parseNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const num = Number(value)
  return Number.isFinite(num) ? num : NaN
}

function parseNullableBoolean(value: unknown) {
  if (value === null || value === undefined) return undefined
  return Boolean(value)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const authCheck = await checkAdminAuth(supabase)
  if ('error' in authCheck) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    )
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const includeInactive = searchParams.get('includeInactive') === 'true'

  let query = supabase
    .from('product_variants')
    .select('*')
    .order('created_at', { ascending: false })

  if (productId) {
    query = query.eq('product_id', productId)
  }

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
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
  const { id } = body

  if (!id) {
    return NextResponse.json(
      { error: 'Variant ID is required' },
      { status: 400 }
    )
  }

  const updateData: Record<string, any> = {}

  if (body.sku !== undefined) updateData.sku = body.sku || null
  if (body.finish !== undefined) updateData.finish = body.finish || null
  if (body.grade !== undefined) updateData.grade = body.grade || null
  if (body.unit !== undefined) updateData.unit = body.unit || null
  if (body.core_type !== undefined) updateData.core_type = body.core_type || null
  if (body.currency !== undefined) updateData.currency = body.currency || 'USD'
  if (body.price_notes !== undefined) updateData.price_notes = body.price_notes || null

  if (body.thickness_mm !== undefined) {
    const value = parseNullableNumber(body.thickness_mm)
    if (Number.isNaN(value)) {
      return NextResponse.json(
        { error: 'thickness_mm must be a valid number' },
        { status: 400 }
      )
    }
    updateData.thickness_mm = value
  }

  if (body.length_mm !== undefined) {
    const value = parseNullableNumber(body.length_mm)
    if (Number.isNaN(value)) {
      return NextResponse.json(
        { error: 'length_mm must be a valid number' },
        { status: 400 }
      )
    }
    updateData.length_mm = value
  }

  if (body.width_mm !== undefined) {
    const value = parseNullableNumber(body.width_mm)
    if (Number.isNaN(value)) {
      return NextResponse.json(
        { error: 'width_mm must be a valid number' },
        { status: 400 }
      )
    }
    updateData.width_mm = value
  }

  if (body.moq !== undefined) {
    const value = parseNullableNumber(body.moq)
    if (Number.isNaN(value)) {
      return NextResponse.json(
        { error: 'moq must be a valid number' },
        { status: 400 }
      )
    }
    updateData.moq = value
  }

  if (body.unit_price !== undefined) {
    const value = parseNullableNumber(body.unit_price)
    if (Number.isNaN(value)) {
      return NextResponse.json(
        { error: 'unit_price must be a valid number' },
        { status: 400 }
      )
    }
    updateData.unit_price = value
  }

  if (body.unit_price_old !== undefined) {
    const value = parseNullableNumber(body.unit_price_old)
    if (Number.isNaN(value)) {
      return NextResponse.json(
        { error: 'unit_price_old must be a valid number' },
        { status: 400 }
      )
    }
    updateData.unit_price_old = value
  }

  if (body.is_active !== undefined) {
    updateData.is_active = parseNullableBoolean(body.is_active)
  }

  if (body.is_price_on_request !== undefined) {
    updateData.is_price_on_request = parseNullableBoolean(
      body.is_price_on_request
    )
  }

  const { data, error } = await supabase
    .from('product_variants')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}