import { Suspense } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { ProductsContent } from '@/components/products/products-content'

export const metadata = {
  title: 'Products | NUMAT',
  description: 'Browse our complete range of premium NuBam engineered bamboo boards for furniture, flooring, doors, structural applications, and more.',
}

import { createClient } from '@supabase/supabase-js'

async function getInitialData() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    const productIds = (products ?? []).map((p: any) => p.id)
    const categoryIds = [...new Set((products ?? []).map((p: any) => p.category_id).filter(Boolean))]

    const { data: variants } = productIds.length > 0
      ? await supabase.from('product_variants').select('*').in('product_id', productIds).eq('is_active', true).order('sort_order', { ascending: true })
      : { data: [] }

    const categoryMap = new Map((categories ?? []).map((c: any) => [c.id, c]))
    const variantsMap = new Map<string, any[]>()
    for (const v of variants ?? []) {
      if (!variantsMap.has(v.product_id)) variantsMap.set(v.product_id, [])
      variantsMap.get(v.product_id)!.push(v)
    }

    const mergedProducts = (products ?? []).map((p: any) => {
      const category = p.category_id ? categoryMap.get(p.category_id) ?? null : null
      const productVariants = variantsMap.get(p.id) ?? []
      const variantPrices = productVariants.map((v: any) => v.base_price_usd).filter((x: any) => typeof x === 'number' && x > 0)
      const startingPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : p.base_price_usd
      return {
        id: p.id, name: p.name, slug: p.slug ?? '', description: p.description ?? '',
        image_url: p.image_url ?? p.image ?? null, is_featured: p.is_featured ?? false,
        base_price_usd: p.base_price_usd, starting_price_usd: startingPrice,
        min_order_qty: p.min_order_qty ?? 1, unit: p.unit ?? 'sheet',
        sku: p.sku ?? '', category: category?.name ?? '', categories: category,
        variants: productVariants, created_at: p.created_at ?? null,
      }
    })

    return { products: mergedProducts, categories: categories ?? [] }
  } catch {
    return { products: [], categories: [] }
  }
}

export default async function ProductsPage() {
  const { products, categories } = await getInitialData()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-background">
        <Suspense fallback={<ProductsLoading />}>
          <ProductsContent initialProducts={products} initialCategories={categories} />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div className="animate-pulse space-y-8">
        <div className="h-10 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}