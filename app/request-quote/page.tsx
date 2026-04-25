import { Suspense } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { CartContent } from '@/components/cart/cart-content'
import { requestQuoteMetadata } from '@/numat-seo-metadata'

export const metadata = requestQuoteMetadata

export default function RequestQuotePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-background">
        <Suspense>
          <CartContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}