import { Suspense } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { QuoteForm } from '@/components/cart/quote-form'
import RequestQuoteLoading from './loading'
import { requestQuoteMetadata } from '@/numat-seo-metadata'

export const metadata = requestQuoteMetadata

export default function RequestQuotePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-background">
        <Suspense fallback={<RequestQuoteLoading />}>
          <QuoteForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
