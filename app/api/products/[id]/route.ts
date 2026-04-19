// ============================================================================
// File path in your repo: app/api/products/[id]/route.ts
//
// Minor update from your current version:
//   - Added `grade` and `applications` to the variant SELECT clause so the
//     public product page can filter NuDoor variants by grade (Light,
//     Composite, Premium).
//   - Added `grade` and `applications` to the mapped variant output.
//   - Removed references to `product.sku` and `product.min_order_qty` on the
//     product row since those columns were dropped. Fallbacks now use the
//     product's unit and moq fields (which still exist).
// ============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 })
  }

  const { id } = await params

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (productError || !product) {
    return NextResponse.json(
      { error: productError?.message ?? 'Product not found.' },
      { status: 404 },
    )
  }

  let categoryName = ''
  if (product.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', product.category_id)
      .maybeSingle()
    categoryName = category?.name ?? ''
  }

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select(`
      id,
      product_id,
      sku,
      size_label,
      length_mm,
      width_mm,
      thickness_mm,
      core_type,
      ply_count,
      unit,
      moq,
      base_price_usd,
      is_price_on_request,
      price_notes,
      is_active,
      in_stock,
      sort_order,
      grade,
      finish,
      applications,
      image_url
    `)
    .eq('product_id', id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })

  if (variantsError) {
    return NextResponse.json({ error: variantsError.message }, { status: 500 })
  }

  const { data: allImages } = await supabase
    .from('product_images')
    .select('id, image_url, alt_text, is_primary, display_order, variant_id')
    .eq('product_id', id)
    .order('display_order', { ascending: true })

  const productImages = (allImages ?? []).filter((img: any) => !img.variant_id)

  const variantImagesMap: Record<string, any[]> = {}
  for (const img of allImages ?? []) {
    if (img.variant_id) {
      if (!variantImagesMap[img.variant_id]) variantImagesMap[img.variant_id] = []
      variantImagesMap[img.variant_id].push(img)
    }
  }

  const mappedVariants = (variants ?? []).map((variant: any) => {
    // Variant images: use image_url column + gallery from product_images
    const gallery = variantImagesMap[variant.id] ?? []
    const heroFromColumn = variant.image_url
      ? [{ id: `hero-${variant.id}`, image_url: variant.image_url, alt_text: '', is_primary: true }]
      : []
    const combinedImages = [...heroFromColumn, ...gallery].map((img: any) => ({
      id: img.id,
      image_url: img.image_url,
      alt_text: img.alt_text ?? '',
      is_primary: img.is_primary ?? false,
    }))

    return {
      id: variant.id,
      sku: variant.sku ?? '',
      thickness_mm: variant.thickness_mm ?? null,
      ply_count: variant.ply_count ?? null,
      dimensions:
        variant.length_mm && variant.width_mm
          ? `${variant.length_mm}mm x ${variant.width_mm}mm`
          : null,
      length_mm: variant.length_mm ?? null,
      width_mm: variant.width_mm ?? null,
      base_price_usd: parsePrice(variant.base_price_usd),
      unit: variant.unit ?? 'piece',
      min_order_qty: variant.moq ?? 1,
      core_type: variant.core_type ?? null,
      grade: variant.grade ?? null,
      finish: variant.finish ?? null,
      applications: variant.applications ?? [],
      size_label: variant.size_label ?? null,
      is_price_on_request: variant.is_price_on_request ?? false,
      price_notes: variant.price_notes ?? null,
      is_available: variant.is_available ?? true,
      in_stock: variant.in_stock ?? true,
      image_url: variant.image_url ?? null,
      images: combinedImages,
    }
  })

  const firstPricedVariant =
    mappedVariants.find(
      (variant) =>
        !variant.is_price_on_request &&
        typeof variant.base_price_usd === 'number' &&
        Number.isFinite(variant.base_price_usd) &&
        variant.base_price_usd > 0,
    ) ?? null

  const canonicalProductPrice = parsePrice(product.base_price_usd)
  const resolvedBasePriceUsd =
    canonicalProductPrice ?? firstPricedVariant?.base_price_usd ?? null

  return NextResponse.json({
    id: product.id,
    name: product.name,
    slug: product.slug ?? '',
    description: product.description ?? '',
    image_url: product.image_url ?? '/placeholder-product.jpg',
    category: categoryName,
    base_price_usd: resolvedBasePriceUsd,
    sku: mappedVariants[0]?.sku ?? '',
    thickness_mm: mappedVariants[0]?.thickness_mm ?? null,
    ply_count: mappedVariants[0]?.ply_count ?? null,
    dimensions: mappedVariants[0]?.dimensions ?? null,
    unit: mappedVariants[0]?.unit ?? product.unit ?? 'piece',
    min_order_qty: mappedVariants[0]?.min_order_qty ?? product.moq ?? 1,
    variants: mappedVariants,
    images: (productImages ?? []).map((img: any) => ({
      id: img.id,
      image_url: img.image_url,
      alt_text: img.alt_text ?? '',
      is_primary: img.is_primary ?? false,
    })),
  })
}
