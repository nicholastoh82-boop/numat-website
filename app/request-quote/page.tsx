import { Suspense } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { CartContent } from '@/components/cart/cart-content'

export const metadata = {
  title: 'Request Quote | NUMAT',
  description:
    'Review your selected products and request a commercial quotation from NUMAT.',
}

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