import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { CartContent } from '@/components/cart/cart-content'

export const metadata = {
  title: 'Your Order | NUMAT',
  description: 'Review your order of NUMAT engineered bamboo boards and check out.',
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
