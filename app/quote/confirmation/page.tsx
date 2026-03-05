import { Suspense } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { QuoteConfirmation } from '@/components/quote/quote-confirmation'

export const metadata = {
  title: 'Quote Confirmation | NUMAT',
  description: 'Your quote has been created and is being delivered.',
}

export default function QuoteConfirmationPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-background">
        <Suspense fallback={<ConfirmationLoading />}>
          <QuoteConfirmation />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

function ConfirmationLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8 text-center">
      <div className="animate-pulse space-y-4">
        <div className="h-16 w-16 bg-muted rounded-full mx-auto" />
        <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
        <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
      </div>
    </div>
  )
}
