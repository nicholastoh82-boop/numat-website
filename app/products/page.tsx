import { Suspense } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { ProductsContent } from '@/components/products/products-content'

export const metadata = {
  title: 'Products | NUMAT',
  description: 'Browse our complete range of premium NuBam engineered bamboo boards for furniture, flooring, doors, structural applications, and more.',
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-background">
        <Suspense fallback={<ProductsLoading />}>
          <ProductsContent />
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
