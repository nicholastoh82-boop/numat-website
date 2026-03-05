import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })

  // Filter by category - using the TEXT 'category' field
  if (category && category !== 'all') {
    // Exact match is safer given your schema stores raw strings like "Structural" or "Furniture"
    // Use ilike for case-insensitive matching against slug input
    // NOTE: If front-end sends slugs ('wall-panelling'), we must map or use ilike

    // Attempt direct match first or ilike match
    // If you have strict categories in DB like "Wall Panelling", a slug "wall-panelling" needs mapping.
    // Assuming simple mapping or direct pass-through:

    if (category === 'wall-panelling') {
      query = query.ilike('category', 'Wall Panelling')
    } else {
      // Generic fallback: try to match simple categories (furniture -> Furniture)
      query = query.ilike('category', category)
    }
  }

  // Search by title (schema has 'title', NOT 'name') or description
  if (search) {
    const searchLower = `%${search.toLowerCase()}%`
    // Fixed Supabase query syntax for OR
    query = query.or(`title.ilike.${searchLower},description.ilike.${searchLower}`)
  }

  const { data: products, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map database columns (Schema) to frontend expectations
  const mappedProducts = (products || []).map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.title,
    title: p.title,
    slug: p.slug || p.id,
    description: p.description || '',
    category: p.category,
    size: p.size,
    thickness: p.thickness_mm,
    thickness_mm: p.thickness_mm,
    width: null,
    length: null,
    color: null,
    finish: null,
    base_price: p.price,
    price: p.price,
    unit: 'pcs',
    min_order_qty: p.moq || 10,
    moq: p.moq || 10,
    lead_time_days: p.lead_time_days || 10,
    is_active: p.is_active,
    is_featured: p.is_featured || false,
    image_url: p.image || '/placeholder-product.jpg',
    categories: null,
    ply: p.ply,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }))

  return NextResponse.json(mappedProducts)
}
