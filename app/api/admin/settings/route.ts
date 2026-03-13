import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const supabase = await createClient()

    const authCheck = await checkAdminAuth(supabase)
    if ('error' in authCheck) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      )
    }

    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        {
          quote_validity_days: 14,
          default_lead_time_days: 10,
          whatsapp_number: '+639123456789',
          sales_email: 'sales@numat.ph',
          bulk_discount_tiers: [
            { min: 20, max: 49, discount: '3%' },
            { min: 50, max: 99, discount: '5%' },
            { min: 100, max: 199, discount: '7%' },
            { min: 200, max: 499, discount: '10%' },
            { min: 500, max: null, discount: '15%' },
          ],
        },
        { status: 200 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load admin settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const authCheck = await checkAdminAuth(supabase)
    if ('error' in authCheck) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      )
    }

    const body = await request.json()

    const payload = {
      quote_validity_days: Number(body.quote_validity_days ?? 14),
      default_lead_time_days: Number(body.default_lead_time_days ?? 10),
      whatsapp_number: body.whatsapp_number ?? '+639123456789',
      sales_email: body.sales_email ?? 'sales@numat.ph',
      bulk_discount_tiers: Array.isArray(body.bulk_discount_tiers)
        ? body.bulk_discount_tiers
        : [
            { min: 20, max: 49, discount: '3%' },
            { min: 50, max: 99, discount: '5%' },
            { min: 100, max: 199, discount: '7%' },
            { min: 200, max: 499, discount: '10%' },
            { min: 500, max: null, discount: '15%' },
          ],
      updated_at: new Date().toISOString(),
    }

    const { data: existing, error: existingError } = await supabase
      .from('admin_settings')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (!existing) {
      const { data, error } = await supabase
        .from('admin_settings')
        .insert(payload)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('admin_settings')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save admin settings' },
      { status: 500 }
    )
  }
}