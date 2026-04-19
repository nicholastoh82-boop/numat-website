import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const [variantsResult, productsResult] = await Promise.all([
      supabase
        .from('product_variants')
        .select('id, sku, product_id, base_price_usd, ex_factory_php, thickness_mm, ply_count, core_type, grade, size_label, unit, moq')
        .eq('is_available', true)
        .not('base_price_usd', 'is', null)
        .order('sku'),
      supabase.from('products').select('id, name'),
    ])

    if (variantsResult.error) {
      return NextResponse.json({ error: variantsResult.error.message }, { status: 500 })
    }

    const productMap = new Map((productsResult.data || []).map(p => [p.id, p.name]))

    const variants = (variantsResult.data || [])
      .filter(v => v.in_stock !== false)
      .map(v => ({
        id: v.id,
        sku: v.sku,
        product_name: productMap.get(v.product_id) || 'Unknown',
        label: `${productMap.get(v.product_id) || 'Unknown'} — ${v.sku}`,
        base_price_usd: Number(v.base_price_usd),
        ex_factory_php: v.ex_factory_php ? Number(v.ex_factory_php) : null,
        size_label: v.size_label || '',
        unit: v.unit || 'piece',
        moq: v.moq || 1,
        thickness_mm: v.thickness_mm,
        ply_count: v.ply_count,
        core_type: v.core_type,
        grade: v.grade,
      }))

    return NextResponse.json(variants)
  } catch (err) {
    console.error('[CRM Variants] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
