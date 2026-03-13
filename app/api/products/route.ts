import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('Products query error:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json([])
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
        .select('*')
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

      const variantUsdPrices = productVariants
        .map((variant) => variant.base_price_usd)
        .filter((price) => typeof price === 'number')

      const startingPriceUsd =
        variantUsdPrices.length > 0
          ? Math.min(...variantUsdPrices)
          : typeof product.base_price_usd === 'number'
          ? product.base_price_usd
          : null

      const firstVariant = productVariants[0] ?? null

      return {
        id: product.id,
        name: product.name,
        slug: product.slug ?? '',
        description: product.description ?? '',
        image_url: product.image_url ?? product.image ?? null,
        is_featured: product.is_featured ?? false,
        base_price_usd: product.base_price_usd ?? null,
        starting_price_usd: startingPriceUsd,
        min_order_qty: product.min_order_qty ?? firstVariant?.moq ?? 1,
        unit: product.unit ?? firstVariant?.unit ?? 'sheet',
        sku: product.sku ?? firstVariant?.sku ?? '',
        category: category?.name ?? '',
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
          base_price_usd: variant.base_price_usd ?? null,
          is_price_on_request: variant.is_price_on_request ?? false,
          price_notes: variant.price_notes ?? null,
          is_active: variant.is_active ?? true,
          sort_order: variant.sort_order ?? null,
        })),
        created_at: product.created_at ?? null,
      }
    })

    return NextResponse.json(mergedProducts, { status: 200 })
  } catch (error) {
    console.error('GET /api/products unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}