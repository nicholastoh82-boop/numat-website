import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export const dynamic = 'force-dynamic'

/**
 * Sellable variants for the CRM quote builder.
 *
 * This route existed but nothing called it. The builder used a hardcoded
 * PRODUCT_VARIANTS array instead, which drifted until it held 34 SKUs across
 * five retired lines and none of the three boards actually on sale. It is wired
 * up now, so the builder cannot drift from Supabase again.
 *
 * PHP is the base currency. The old version required base_price_usd to be non
 * null, which by itself excluded every current product, since they are all
 * priced in PHP.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('product_variants')
      // Single string literal: Supabase infers the row type by parsing this,
      // and concatenation degrades it to GenericStringError.
      .select(`id, sku, product_id, base_price_php, ex_factory_php, thickness_mm, ply_count, core_type, grade, size_label, unit, moq, in_stock, is_available, sort_order, products!inner(id, name, description, is_active)`)
      .eq('is_available', true)
      .eq('products.is_active', true)
      .not('base_price_php', 'is', null)
      .order('sku')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // products is a to-one FK. Supabase types it as an array without generated
    // DB types, but returns a single object.
    type Row = (typeof data)[number] & {
      products: { id: string; name: string; description: string | null; is_active: boolean }
    }

    const variants = (data as unknown as Row[])
      .filter((v) => v.in_stock !== false)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        productId: v.product_id,
        productName: v.products?.name ?? 'Unknown',
        description: v.products?.description ?? '',
        category: v.products?.name ?? 'Unknown',
        sizeLabel: v.size_label ?? '',
        thicknessMm: v.thickness_mm,
        plyCount: v.ply_count,
        coreType: v.core_type,
        unit: v.unit ?? 'piece',
        moq: v.moq ?? 1,
        basePricePhp: Number(v.base_price_php),
        // Cost floor, in PHP. Null on every current variant, so the floor check
        // stays inert until these are populated.
        exFactoryPhp: v.ex_factory_php === null ? null : Number(v.ex_factory_php),
        label: `${v.sku} — ${v.size_label ?? ''}`.trim(),
      }))

    return NextResponse.json({ variants })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load variants'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
