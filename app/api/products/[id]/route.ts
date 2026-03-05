import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params)
    const supabase = await createClient()

    // Fetch product with category details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Fetch all images for this product
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('display_order', { ascending: true })

    if (imagesError) {
      return NextResponse.json(
        { error: imagesError.message },
        { status: 500 }
      )
    }

    // Map the response to match frontend expectations
    const mappedProduct = {
      id: product.id,
      sku: product.sku,
      name: product.title,
      title: product.title,
      slug: product.slug,
      description: product.description || '',
      category: product.category,
      size: product.size,
      thickness: product.thickness_mm,
      thickness_mm: product.thickness_mm,
      base_price: product.price,
      price: product.price,
      moq: product.moq || 10,
      min_order_qty: product.moq || 10,
      lead_time_days: product.lead_time_days || 10,
      is_active: product.is_active,
      is_featured: product.is_featured || false,
      unit: 'pcs',
      ply: product.ply,
      image_url: product.image || '/placeholder-product.jpg',
      images: (images || []).map((img: any) => ({
        id: img.id,
        product_id: img.product_id,
        image_url: img.image_url,
        alt_text: img.alt_text,
        display_order: img.display_order,
        created_at: img.created_at,
      })),
      created_at: product.created_at,
      updated_at: product.updated_at,
    }

    return NextResponse.json(mappedProduct)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
