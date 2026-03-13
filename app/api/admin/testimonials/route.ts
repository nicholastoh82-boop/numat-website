import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('testimonials')
      .select(
        'id, name, location, testimonial, sort_order, is_active, created_at'
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin testimonials GET error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch testimonials' },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        }
      )
    }

    return NextResponse.json(data ?? [], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error) {
    console.error('Admin testimonials GET exception:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch testimonials',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const name = String(body?.name ?? '').trim()
    const location = String(body?.location ?? '').trim()
    const testimonial = String(body?.testimonial ?? '').trim()

    const sort_order =
      body?.sort_order === '' || body?.sort_order == null
        ? 0
        : Number(body.sort_order)

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
        sort_order: Number.isNaN(sort_order) ? 0 : sort_order,
        is_active,
      })
      .select(
        'id, name, location, testimonial, sort_order, is_active, created_at'
      )
      .single()

    if (error) {
      console.error('Admin testimonials POST error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create testimonial' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Admin testimonials POST exception:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create testimonial',
      },
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

    const { data: existing, error: existingError } = await supabase
      .from('testimonials')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      console.error('Admin testimonials DELETE existing check error:', existingError)
      return NextResponse.json(
        { error: existingError.message || 'Failed to verify testimonial' },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Admin testimonials DELETE error:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete testimonial' },
        { status: 500 }
      )
    }

    const { data: verifyStillExists, error: verifyError } = await supabase
      .from('testimonials')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (verifyError) {
      console.error('Admin testimonials DELETE verify error:', verifyError)
      return NextResponse.json(
        { error: verifyError.message || 'Failed to verify deletion' },
        { status: 500 }
      )
    }

    if (verifyStillExists) {
      return NextResponse.json(
        { error: 'Delete request completed but row still exists' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, deletedId: id },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('Admin testimonials DELETE exception:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete testimonial',
      },
      { status: 500 }
    )
  }
}