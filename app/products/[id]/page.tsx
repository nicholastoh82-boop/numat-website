import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { ProductDetailContent } from '@/components/products/product-detail-content'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Product Details | NUMAT',
  description: 'View detailed product information',
}

interface ProductPageProps {
  params: {
    id: string
  }
}

async function getProduct(id: string) {
  try {
    const supabase = await createClient()
    
    // Fetch product with category details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (productError || !product) {
      return null
    }

    // Fetch all images for this product
    const { data: images } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('display_order', { ascending: true })

    // Map the response to match frontend expectations
    return {
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
  } catch (error) {
    return null
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await Promise.resolve(params)
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-background">
        <Suspense fallback={<ProductDetailLoading />}>
          <ProductDetailContent product={product} />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-muted rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-10 bg-muted rounded w-1/3" />
          </div>
        </div>
      </div>
    </div>
  )
}
