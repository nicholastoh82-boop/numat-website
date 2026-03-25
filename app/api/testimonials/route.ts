import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('testimonials')
      .select('id, name, location, testimonial, sort_order, is_active, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin testimonials GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Admin testimonials GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const name = body?.name?.trim?.() || ''
    const location = body?.location?.trim?.() || ''
    const testimonial = body?.testimonial?.trim?.() || ''
    const sort_order =
      typeof body?.sort_order === 'number'
        ? body.sort_order
        : Number(body?.sort_order || 0)
    const is_active =
      typeof body?.is_active === 'boolean' ? body.is_active : true

    if (!name || !testimonial) {
      return NextResponse.json(
        { error: 'Name and testimonial are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        name,
        location,
        testimonial,
        sort_order,
        is_active,
      })
      .select('id, name, location, testimonial, sort_order, is_active, created_at')
      .single()

    if (error) {
      console.error('Admin testimonials POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Admin testimonials POST exception:', error)
    return NextResponse.json(
      { error: 'Failed to create testimonial' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing testimonial id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Admin testimonials DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin testimonials DELETE exception:', error)
    return NextResponse.json(
      { error: 'Failed to delete testimonial' },
      { status: 500 }
    )
  }
}