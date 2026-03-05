import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { CartContent } from '@/components/cart/cart-content'

export const metadata = {
  title: 'Request Quote | NUMAT',
  description: 'Review your cart and request an instant quote delivered via WhatsApp or Viber.',
}

export default function CartPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-background">
        <CartContent />
      </main>
      <Footer />
    </div>
  )
}
