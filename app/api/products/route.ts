import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const PUBLIC_PRODUCT_FIELDS =
  'id, name, slug, description, image_url, is_featured, is_active, category_id'

const PUBLIC_VARIANT_FIELDS =
  'id, product_id, sku, size_label, length_mm, width_mm, thickness_mm, core_type, ply_count, unit, moq, is_price_on_request, price_notes, is_active, is_available, in_stock, sort_order'

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300',
}

export async function GET() {
  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(PUBLIC_PRODUCT_FIELDS)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('Products query error:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json([], { status: 200, headers: PUBLIC_CACHE_HEADERS })
    }

    const categoryIds = Array.from(
      new Set(
        products
          .map((product) => product.category_id)
          .filter((value): value is string => Boolean(value))
      )
    )

    const productIds = products
      .map((product) => product.id)
      .filter((value): value is string => Boolean(value))

    let categories: any[] = []
    if (categoryIds.length > 0) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .in('id', categoryIds)

      if (categoriesError) {
        console.error('Categories query error:', categoriesError)
        return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 })
      }

      categories = categoriesData ?? []
    }

    let variants: any[] = []
    if (productIds.length > 0) {
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select(PUBLIC_VARIANT_FIELDS)
        .in('product_id', productIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (variantsError) {
        console.error('Variants query error:', variantsError)
        return NextResponse.json(
          { error: 'Failed to fetch product variants.' },
          { status: 500 }
        )
      }

      variants = variantsData ?? []
    }

    const categoryMap = new Map(categories.map((category) => [category.id, category]))
    const variantsMap = new Map<string, any[]>()

    for (const variant of variants) {
      const productId = variant.product_id
      if (!productId) continue

      if (!variantsMap.has(productId)) {
        variantsMap.set(productId, [])
      }

      variantsMap.get(productId)!.push(variant)
    }

    const mergedProducts = products.map((product) => {
      const category = product.category_id
        ? categoryMap.get(product.category_id) ?? null
        : null

      const productVariants = variantsMap.get(product.id) ?? []

      return {
        id: product.id,
        name: product.name,
        slug: product.slug ?? '',
        description: product.description ?? '',
        image_url: product.image_url ?? null,
        is_featured: product.is_featured ?? false,
        is_active: product.is_active ?? true,
        categories: category,
        variants: productVariants.map((variant) => ({
          id: variant.id,
          product_id: variant.product_id,
          sku: variant.sku ?? '',
          size_label: variant.size_label ?? '',
          length_mm: variant.length_mm ?? null,
          width_mm: variant.width_mm ?? null,
          thickness_mm: variant.thickness_mm ?? null,
          core_type: variant.core_type ?? null,
          ply_count: variant.ply_count ?? null,
          unit: variant.unit ?? 'sheet',
          moq: variant.moq ?? 1,
          is_price_on_request: variant.is_price_on_request ?? false,
          price_notes: variant.price_notes ?? null,
          is_active: variant.is_active ?? true,
          is_available: variant.is_available ?? true,
          in_stock: variant.in_stock ?? true,
          sort_order: variant.sort_order ?? null,
        })),
      }
    })

    return NextResponse.json(mergedProducts, { status: 200, headers: PUBLIC_CACHE_HEADERS })
  } catch (error) {
    console.error('GET /api/products unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
