import { createClient } from '@supabase/supabase-js'

/**
 * Single source for loading a product with its variants and images.
 *
 * Extracted so that /api/products/[id] and the /products/[id] server component
 * cannot drift apart. The page needs this on the server to emit real metadata
 * and server rendered content, and the route still needs it for the client
 * refresh, so the query lives here rather than being written twice.
 */

export type ProductVariant = {
  id: string
  sku: string
  thickness_mm: number | null
  ply_count: number | null
  dimensions: string | null
  length_mm: number | null
  width_mm: number | null
  base_price_php: number | null
  unit: string
  min_order_qty: number
  core_type: string | null
  grade: string | null
  finish: string | null
  applications: string[]
  size_label: string | null
  is_price_on_request: boolean
  price_notes: string | null
  is_available: boolean
  in_stock: boolean
  image_url: string | null
  images: ProductImage[]
}

export type ProductImage = {
  id: string
  image_url: string
  alt_text: string
  is_primary: boolean
}

export type ProductDetail = {
  id: string
  name: string
  slug: string
  description: string
  image_url: string
  category: string
  base_price_php: number | null
  is_price_on_request: boolean
  sku: string
  thickness_mm: number | null
  ply_count: number | null
  dimensions: string | null
  unit: string
  min_order_qty: number
  variants: ProductVariant[]
  images: ProductImage[]
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function client() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Every active product slug, for generateStaticParams and the sitemap. */
export async function getProductSlugs(): Promise<string[]> {
  const supabase = client()
  if (!supabase) return []
  const { data } = await supabase.from('products').select('slug').eq('is_active', true)
  return (data ?? []).map((row) => row.slug).filter((slug): slug is string => Boolean(slug))
}

/**
 * Accepts either a UUID or a slug. The nav links to /products/nuweave, and a
 * readable URL is worth more than forcing a UUID into the address bar.
 */
export async function getProduct(idOrSlug: string): Promise<ProductDetail | null> {
  const supabase = client()
  if (!supabase) return null

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq(isUuid ? 'id' : 'slug', idOrSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (!product) return null

  let categoryName = ''
  if (product.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', product.category_id)
      .maybeSingle()
    categoryName = category?.name ?? ''
  }

  const { data: variants } = await supabase
    .from('product_variants')
    .select(
      // Must stay a single string literal. Supabase infers the row type by
      // parsing this at the type level, and a concatenated string degrades to
      // GenericStringError, which is what forced the `any` casts here before.
      `id, product_id, sku, size_label, length_mm, width_mm, thickness_mm, core_type, ply_count, unit, moq, base_price_php, is_price_on_request, price_notes, is_active, is_available, in_stock, sort_order, grade, finish, applications, image_url`,
    )
    .eq('product_id', product.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })

  const { data: allImages } = await supabase
    .from('product_images')
    .select('id, image_url, alt_text, is_primary, display_order, variant_id')
    .eq('product_id', product.id)
    .order('display_order', { ascending: true })

  const productImages = (allImages ?? []).filter((img) => !img.variant_id)

  const variantImagesMap: Record<string, typeof productImages> = {}
  for (const img of allImages ?? []) {
    if (img.variant_id) {
      if (!variantImagesMap[img.variant_id]) variantImagesMap[img.variant_id] = []
      variantImagesMap[img.variant_id].push(img)
    }
  }

  const mappedVariants: ProductVariant[] = (variants ?? []).map((variant) => {
    const gallery = variantImagesMap[variant.id] ?? []
    const heroFromColumn = variant.image_url
      ? [{ id: `hero-${variant.id}`, image_url: variant.image_url, alt_text: '', is_primary: true }]
      : []
    const combinedImages: ProductImage[] = [...heroFromColumn, ...gallery].map((img) => ({
      id: String(img.id),
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
      base_price_php: parsePrice(variant.base_price_php),
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
        typeof variant.base_price_php === 'number' &&
        variant.base_price_php > 0,
    ) ?? null

  const resolvedBasePricePhp =
    parsePrice(product.base_price_php) ?? firstPricedVariant?.base_price_php ?? null

  return {
    id: product.id,
    name: product.name,
    slug: product.slug ?? '',
    description: product.description ?? '',
    image_url: product.image_url ?? '/placeholder-product.jpg',
    category: categoryName,
    base_price_php: product.is_price_on_request ? null : resolvedBasePricePhp,
    is_price_on_request: product.is_price_on_request ?? false,
    sku: mappedVariants[0]?.sku ?? '',
    thickness_mm: mappedVariants[0]?.thickness_mm ?? null,
    ply_count: mappedVariants[0]?.ply_count ?? null,
    dimensions: mappedVariants[0]?.dimensions ?? null,
    unit: mappedVariants[0]?.unit ?? product.unit ?? 'piece',
    min_order_qty: mappedVariants[0]?.min_order_qty ?? product.moq ?? 1,
    variants: mappedVariants,
    images: productImages.map((img) => ({
      id: String(img.id),
      image_url: img.image_url,
      alt_text: img.alt_text ?? '',
      is_primary: img.is_primary ?? false,
    })),
  }
}
