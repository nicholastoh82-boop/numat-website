import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - list all testimonials
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('GET /api/admin/testimonials error:', err)
    return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 })
  }
}

// POST - create new testimonial
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, company, logo_url, location, testimonial, sort_order, is_active } = body

    if (!name || !testimonial) {
      return NextResponse.json({ error: 'Name and testimonial are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        name,
        company: company || null,
        logo_url: logo_url || null,
        location: location || null,
        testimonial,
        sort_order: sort_order ?? 0,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('POST /api/admin/testimonials error:', err)
    return NextResponse.json({ error: 'Failed to create testimonial' }, { status: 500 })
  }
}

// PATCH - update existing testimonial
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const body = await req.json()
    const { name, company, logo_url, location, testimonial, sort_order, is_active } = body

    if (!name || !testimonial) {
      return NextResponse.json({ error: 'Name and testimonial are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('testimonials')
      .update({
        name,
        company: company || null,
        logo_url: logo_url || null,
        location: location || null,
        testimonial,
        sort_order: sort_order ?? 0,
        is_active: is_active ?? true,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/admin/testimonials error:', err)
    return NextResponse.json({ error: 'Failed to update testimonial' }, { status: 500 })
  }
}

// DELETE - remove testimonial
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/testimonials error:', err)
    return NextResponse.json({ error: 'Failed to delete testimonial' }, { status: 500 })
  }
}